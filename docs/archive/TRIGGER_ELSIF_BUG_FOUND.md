# 🐛 CRITICAL BUG FOUND: ELSIF Logic Prevents signal_closed Notifications

**Date:** 2025-11-12 09:45 UTC  
**Severity:** 🔴 **HIGH**  
**Impact:** `signal_closed` notifications are NEVER sent when signal closes with all TPs hit

---

## 🔍 **ROOT CAUSE:**

The database trigger uses `ELSIF` logic, which means **only ONE notification type can be sent per UPDATE**:

```sql
IF TG_OP = 'INSERT' THEN
  -- signal_created
ELSIF TG_OP = 'UPDATE' AND NEW.tp_hits IS DISTINCT FROM OLD.tp_hits THEN
  -- tp_hit ✅ MATCHES FIRST
ELSIF TG_OP = 'UPDATE' AND NEW.status = 'closed' THEN
  -- signal_closed ❌ NEVER REACHED
```

---

## 🎯 **THE PROBLEM:**

When `price-ingestor` detects all TPs are hit, it does a **SINGLE UPDATE** that changes BOTH:
1. `tp_hits` array (adds final TP)
2. `status` to `'closed'`
3. `close_reason` to `'all_tps_hit'`

**Example:**
```sql
UPDATE trade_alerts SET
  tp_hits = ARRAY[1,2,3,4,5],  -- ← TP5 added
  status = 'closed',            -- ← Status changed
  close_reason = 'all_tps_hit'  -- ← Reason set
WHERE id = '6bee9202-ebb8-45f5-8044-35d6dab3088e';
```

**What the trigger does:**
1. ✅ Checks `NEW.tp_hits IS DISTINCT FROM OLD.tp_hits` → **TRUE** (TP5 added)
2. ✅ Sends `tp_hit` notification for TP5
3. ❌ **STOPS HERE** because `ELSIF` was already matched
4. ❌ Never checks `NEW.status = 'closed'`
5. ❌ **NO `signal_closed` notification sent!**

---

## 📊 **EVIDENCE:**

**Test Signal:** `6bee9202-ebb8-45f5-8044-35d6dab3088e`

**Database State:**
- `status`: `'closed'`
- `close_reason`: `'all_tps_hit'`
- `tp_hits`: `[1,2,3,4,5]`
- `updated_at`: `2025-11-12 09:39:38.038562+00`

**Notifications Sent:**
- ✅ `signal_created` (1x)
- ✅ `tp_hit` (5x - for TP1, TP2, TP3, TP4, TP5)
- ❌ `signal_closed` (0x - **MISSING!**)

**Audit Trail Query:**
```sql
SELECT notification_type, COUNT(*) 
FROM notification_audit_trail
WHERE signal_id = '6bee9202-ebb8-45f5-8044-35d6dab3088e'
GROUP BY notification_type;
```

**Result:**
| notification_type | count |
|------------------|-------|
| signal_created   | 1     |
| tp_hit           | 5     |

---

## 🔧 **THE FIX:**

**Option 1: Change ELSIF to Multiple IF Statements** (RECOMMENDED)

Allow the trigger to send **multiple notifications** for a single UPDATE:

```sql
-- Check for TP hits
IF TG_OP = 'UPDATE' AND NEW.tp_hits IS DISTINCT FROM OLD.tp_hits THEN
  -- Send tp_hit notification
  -- (keep existing logic)
END IF;

-- Check for signal closed (separate IF, not ELSIF)
IF TG_OP = 'UPDATE' AND NEW.status = 'closed' AND OLD.status::text != 'closed' THEN
  IF NEW.close_reason = 'stop_loss' THEN
    -- Send stop_loss_hit notification
  ELSE
    -- Send signal_closed notification
  END IF;
END IF;

-- Check for limit activation (separate IF)
IF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'active' THEN
  -- Send limit_activated notification
END IF;

-- Check for notes update (separate IF)
IF TG_OP = 'UPDATE' AND NEW.notes IS DISTINCT FROM OLD.notes AND NEW.notes IS NOT NULL THEN
  -- Send notes_updated notification
END IF;
```

**Option 2: Modify price-ingestor to Do Two Separate UPDATEs**

Less ideal because it causes the trigger to fire twice:
```typescript
// First UPDATE: Just the final TP
UPDATE trade_alerts SET tp_hits = ARRAY[1,2,3,4,5] WHERE id = '...';

// Second UPDATE: Close the signal
UPDATE trade_alerts SET status = 'closed', close_reason = 'all_tps_hit' WHERE id = '...';
```

---

## 📝 **RECOMMENDED SOLUTION:**

**Fix the trigger to use independent IF statements** instead of ELSIF:

### **Benefits:**
✅ Allows multiple notifications per UPDATE  
✅ More intuitive logic (each check is independent)  
✅ No changes needed to `price-ingestor`  
✅ Matches user expectations (both TP5 hit AND signal closed should notify)

### **Implementation:**
1. Drop and recreate the `instant_notification_router()` function
2. Replace all `ELSIF` (except the first one after INSERT) with `IF`
3. Keep track of which notifications were sent to avoid HTTP call duplication
4. Test with a new signal

---

## 🎯 **AFFECTED EDGE FUNCTIONS:**

Currently NOT being triggered due to this bug:
- ❌ `notify-signal-closed` - Never fires when signal closes with all TPs hit
- ⚠️ `notify-stop-loss-hit` - Would also be affected if SL hit during TP update
- ⚠️ `notify-limit-activated` - Could be affected if limit activates during TP update
- ⚠️ `notify-notes-updated` - Could be affected if notes updated during TP update

---

## 📊 **IMPACT ASSESSMENT:**

**Current State:**
- 🟢 `notify-signal-created` - ✅ Working (always first operation)
- 🟢 `notify-tp-hit` - ✅ Working (but blocks other notifications)
- 🔴 `notify-signal-closed` - ❌ **BROKEN** (never sent when all TPs hit)
- 🟡 `notify-stop-loss-hit` - ⚠️ Untested (likely affected by same bug)
- 🟡 `notify-limit-activated` - ⚠️ Untested (likely affected by same bug)
- 🟡 `notify-notes-updated` - ⚠️ Untested (likely affected by same bug)

**After Fix:**
- 🟢 All 6 notification types will work independently
- 🟢 Multiple notifications can be sent for a single UPDATE
- 🟢 Users will receive BOTH "TP5 hit" AND "Signal closed" notifications

---

## 🚨 **ACTION REQUIRED:**

1. ✅ Create corrected migration with IF statements instead of ELSIF
2. ✅ Apply migration to database
3. ✅ Test with new signal that hits all TPs
4. ✅ Verify `signal_closed` notification is sent

**Estimated Time:** 15 minutes

