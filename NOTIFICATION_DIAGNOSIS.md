# 🚨 NOTIFICATION SYSTEM DIAGNOSIS

**Date:** November 9, 2025  
**Issue:** "undefined reached Take Profit" + Duplicate notifications  
**Status:** ⚠️ MULTIPLE SYSTEMS RUNNING

---

## 🔍 PROBLEMS IDENTIFIED:

### **1. "undefined" in notification title** ❌
**What user sees:**
```
"undefined reached Take Profit 1"
```

**Root cause:**
The `author_name` field is coming through the trigger correctly from the database (`Jacob Estayo`), but somewhere in the chain it's becoming `undefined`.

**Location:** 
- Trigger passes: `author_name: 'Jacob Estayo'` ✅
- Edge Function receives: `author_name: undefined` ❌

---

### **2. Duplicate Notifications** ❌❌❌
**What user sees:**
- Same TP notification appears 3-4 times
- Both "Educator" and "System" as senders
- Multiple Sonner toasts stacking

**Root causes:**
1. **Old Edge Function still being called:**
   - `enhanced-signal-notification-dispatcher` (OLD system) 
   - Shows in logs at timestamp `1762735512014`
   
2. **Possible frontend duplication:**
   - Frontend might be subscribing to multiple channels
   - Frontend might be calling old notification service

3. **Multiple triggers per TP hit:**
   - Trigger fires for TP1
   - Then again when `tp_hits` array updates
   - Possible race condition

---

## 🔧 FIXES REQUIRED:

### **Fix 1: Debug author_name undefined**

The trigger SQL shows:
```sql
SELECT 
  COALESCE(NULLIF(trim(display_name), ''), 'Unknown Trader') as display_name
INTO author_profile
FROM public.profiles
WHERE id = NEW.user_id;
```

This should work! Let me check the Edge Function parsing:

**Current Edge Function code:**
```typescript
const { signal, tp_number, triggered_price, pips, users, push_users } = await req.json();

const signalData: SignalData = {
  ...signal,  // ← This spreads signal object
  tp_number,
  triggered_price,
  pips: pips || '+0.0 PIPS',
};
```

**Problem:** The `signal` object contains `author_name` nested inside it, but the template tries to access `data.author_name` directly.

**Solution:** Ensure the trigger payload matches what the Edge Function expects.

---

### **Fix 2: Stop old Edge Function from being called**

The old `enhanced-signal-notification-dispatcher` is still getting HTTP calls somehow.

**Check these locations:**
1. ✅ Database triggers - CLEAN (only new trigger exists)
2. ❓ Frontend code - Might still call old function
3. ❓ Other Edge Functions - Might chain-call old function
4. ❓ Old migrations - Might recreate old trigger

---

### **Fix 3: Prevent duplicate TP notifications**

Each TP hit is triggering multiple times:
```
16:44:41 - TP1 notification
16:44:43 - TP1 notification (duplicate)
16:44:45 - TP1 notification (duplicate)
```

**Cause:** The trigger fires every time `tp_hits` array changes, but it's firing multiple times for the same TP.

**Solution:** Add deduplication in the trigger itself.

---

## 🎯 RECOMMENDED ACTIONS:

### **Priority 1: Fix "undefined" name**

Check what the trigger is actually sending:

```sql
-- Add logging to trigger
RAISE NOTICE 'Author profile: name=%, avatar=%, type=%', 
  author_profile.display_name,
  author_profile.avatar_url,
  author_profile.user_type;

RAISE NOTICE 'Payload: %', payload;
```

### **Priority 2: Find and disable old function calls**

Search frontend for:
```typescript
// Old pattern (REMOVE):
fetch('enhanced-signal-notification-dispatcher')

// New pattern (KEEP):
// None - database trigger handles it all!
```

### **Priority 3: Add TP deduplication**

Modify trigger to track which TPs have been notified:
```sql
-- Only notify if this is a NEW TP hit
IF OLD.tp_hits IS DISTINCT FROM NEW.tp_hits THEN
  -- Get the NEWLY added TP number
  tp_number := NEW.tp_hits[array_length(NEW.tp_hits, 1)];
  
  -- Check if we already notified for this TP
  -- (Add check against dedup table)
END IF;
```

---

## 📊 CURRENT SYSTEM STATUS:

| Component | Status | Notes |
|-----------|--------|-------|
| **New Trigger** | ✅ Active | `instant_notification_router` |
| **New Edge Functions** | ✅ Deployed | All 6 functions live |
| **Old Trigger** | ✅ Removed | No longer exists |
| **Old Edge Function** | ❌ Still called | `enhanced-signal-notification-dispatcher` |
| **Frontend** | ❓ Unknown | Needs inspection |
| **Deduplication** | ❌ Not working | Duplicates appearing |

---

## 🚀 NEXT STEPS:

1. Add logging to trigger to see exact payload
2. Check Edge Function logs for received data
3. Search frontend for old function calls
4. Add TP-level deduplication
5. Test with single TP hit

---

## 📝 TEST PLAN:

After fixes:
1. Create new signal
2. Let it hit TP1
3. Verify:
   - ✅ ONE notification with correct name
   - ✅ No duplicates
   - ✅ Correct pips calculation
   - ✅ Sound plays once

