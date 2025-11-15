# ⚠️ CRITICAL: Edge Function Deployment Required

**Status:** UUID parsing fix is coded and committed, but NOT YET DEPLOYED  
**Impact:** Push notifications will continue to fail until deployment  
**Action Required:** Manual deployment via Supabase Dashboard

---

## 🐛 **THE BUG (STILL ACTIVE IN PRODUCTION):**

```
Error: invalid UUID format
at .in('id', pushUserIds)
```

**Root Cause:** The database trigger sends user objects `[{user_id: 'uuid', player_id: '...'}]`, but the Edge Functions (v47) expect strings `['uuid1', 'uuid2']`.

---

## ✅ **THE FIX (CODED BUT NOT DEPLOYED):**

**File:** `supabase/functions/_shared/notification-core.ts`  
**Lines Fixed:**  
- 167-176: `sendRealtimeNotification()` - Extract `user_id` from objects
- 334-342: `sendPushNotification()` - Extract `user_id` from objects

**Code:**
```typescript
const userIds = Array.isArray(pushUserIds) 
  ? pushUserIds.map((u: any) => typeof u === 'string' ? u : u.user_id).filter(Boolean)
  : [];
```

**Commit:** `c9ff3341` (pushed to `main` branch)

---

## 🚀 **HOW TO DEPLOY (MANUAL):**

### **Option 1: Via Supabase Dashboard** ✅ RECOMMENDED

1. Go to: https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/functions

2. Deploy these 6 functions (click each, then "Deploy new version"):
   - `notify-signal-created`
   - `notify-tp-hit`
   - `notify-stop-loss-hit`
   - `notify-signal-closed`
   - `notify-limit-activated`
   - `notify-notes-updated`

3. Supabase will automatically pull the latest code from your repository (connected to GitHub).

4. Each function will update from **v47 → v48**.

### **Option 2: Via Supabase CLI** (Requires login first)

```bash
# Login first
supabase login

# Then deploy
cd "/Users/nthny_11/Trade imperial GITHUB /sidebar/imperial-trade"
supabase functions deploy --project-ref kmuoqkcxguafxulqlbmi --no-verify-jwt
```

---

## 🧪 **TESTING AFTER DEPLOYMENT:**

1. **Delete the old test signal:**
   ```sql
   DELETE FROM trade_alerts WHERE id = '7e014b61-2326-499d-b9f0-9aaa9d583a51';
   ```

2. **Create a new test signal (BITCOIN or XAUUSD only!):**
   ```sql
   INSERT INTO public.trade_alerts (
     user_id, asset_name, trade_type,
     entry_price, stop_loss, tp1, tp2, tp3, tp4, tp5,
     tradermade_symbol, status
   )
   SELECT 
     id, 'BITCOIN', 'buy',
     104300.00, 104200.00, 
     104400.00, 104500.00, 104600.00, 104700.00, 104800.00,
     'BTCUSD', 'active'
   FROM profiles WHERE user_type = 'educator' LIMIT 1
   RETURNING id, asset_name, entry_price, status;
   ```

3. **Check Edge Function logs** (should show):
   ```
   ✅ [Realtime Broadcast] SUCCESS
   ✅ Push sent successfully: recipients: 14
   ```

4. **Verify NO errors** (should NOT see):
   ```
   ❌ invalid UUID format
   ❌ column "status" does not exist
   ```

---

## 📊 **CURRENT STATUS:**

| Component | Status | Version |
|-----------|--------|---------|
| Database Trigger | ✅ WORKING | instant_notification_router (v4) |
| Edge Function Code (GitHub) | ✅ FIXED | Commit c9ff3341 |
| Edge Functions (Deployed) | ❌ OLD | v47 (has UUID bug) |
| Push Notifications | ❌ FAILING | Due to UUID parsing error |
| In-App Notifications | ✅ WORKING | Realtime working (fixed) |

---

## 🎯 **EXPECTED RESULTS AFTER DEPLOYMENT:**

✅ **Before:** Push notifications failed with UUID error  
✅ **After:** Push notifications sent to all 14 active users  

✅ **Before:** Edge Function logs showed parsing errors  
✅ **After:** Edge Function logs show successful delivery  

✅ **Before:** Only in-app notifications worked  
✅ **After:** BOTH in-app AND push notifications work  

---

**🚨 ACTION REQUIRED:** Deploy the 6 Edge Functions via Supabase Dashboard to activate the UUID fix!

