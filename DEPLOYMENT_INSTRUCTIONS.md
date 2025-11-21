# 🚀 EDGE FUNCTION DEPLOYMENT INSTRUCTIONS

## ✅ **ANALYTICS FIX APPLIED - READY TO DEPLOY**

**Date:** November 21, 2025  
**Status:** Code fixed in `notification-core.ts`, awaiting deployment

---

## 📦 **WHAT WAS FIXED**

### **File:** `supabase/functions/_shared/notification-core.ts`

**Changes:**
- ✅ Added analytics logging for zero-recipient scenarios
- ✅ Logs when no push-enabled users
- ✅ Logs when no Player IDs found
- ✅ Logs when users filtered by preferences
- ✅ Each log includes failure reason for dashboard visibility

**Impact:**
- Dashboard will now show attempted notifications
- Can track why notifications fail
- Better system health monitoring

---

## 🔧 **DEPLOYMENT OPTIONS**

### **Option 1: Automated Script (Recommended)** ⚡

```powershell
# Run from project root:
.\deploy-notification-functions.ps1
```

**This will deploy all 6 functions automatically.**

---

### **Option 2: Manual CLI Deployment** 🔨

```bash
# Deploy each function individually:
npx supabase functions deploy notify-signal-created --project-ref kmuoqkcxguafxulqlbmi
npx supabase functions deploy notify-tp-hit --project-ref kmuoqkcxguafxulqlbmi
npx supabase functions deploy notify-stop-loss-hit --project-ref kmuoqkcxguafxulqlbmi
npx supabase functions deploy notify-signal-closed --project-ref kmuoqkcxguafxulqlbmi
npx supabase functions deploy notify-limit-activated --project-ref kmuoqkcxguafxulqlbmi
npx supabase functions deploy notify-notes-updated --project-ref kmuoqkcxguafxulqlbmi
```

---

### **Option 3: Supabase Dashboard (Easiest)** 🌐

1. **Go to:** https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/functions

2. **For each function** (6 total):
   - Click on function name
   - Click **"Deploy new version"** button
   - System auto-deploys from GitHub `main` branch

3. **Functions to deploy:**
   - notify-signal-created
   - notify-tp-hit
   - notify-stop-loss-hit
   - notify-signal-closed
   - notify-limit-activated
   - notify-notes-updated

---

## ✅ **VERIFY DEPLOYMENT**

### **After Deployment, Check:**

1. **Edge Function Logs:**
```
Go to: Supabase Dashboard → Edge Functions → [Function Name] → Logs
Look for: New version number (v233+)
```

2. **Test Analytics Logging:**
```sql
-- Create a test signal
-- Then check analytics:
SELECT 
  COUNT(*) as logged_attempts,
  failure_reason
FROM notification_analytics
WHERE sent_at > NOW() - INTERVAL '5 minutes'
GROUP BY failure_reason;
```

**Expected Results:**
- Should see rows with `failure_reason = 'No Player ID available'`
- Should see one row per subscribed user
- Dashboard should show data!

---

## 📊 **EXPECTED DASHBOARD CHANGES**

### **Before Deployment:**
```
Total Notifications: 0
Delivered: 0
Failed: 0
Status: ❌ Looks broken
```

### **After Deployment:**
```
Total Notifications: 30+ (depends on trigger count)
Delivered: 0 (no Player IDs yet)
Failed: 30+ 
Failure Reason: "No Player ID available"
Status: ⏳ Waiting for Player IDs
```

---

## 🎯 **SUCCESS CRITERIA**

- ✅ All 6 functions deployed successfully
- ✅ New version numbers visible in dashboard
- ✅ Test signal creates analytics rows
- ✅ Dashboard shows notification attempts
- ✅ Failure reasons logged correctly

---

## 🔍 **TROUBLESHOOTING**

### **If deployment fails:**

1. **Check Supabase CLI is installed:**
   ```bash
   npx supabase --version
   ```

2. **Check you're logged in:**
   ```bash
   npx supabase login
   ```

3. **Use Dashboard method instead** (Option 3 above)

### **If analytics still empty after deployment:**

1. **Create a new test signal:**
   ```sql
   INSERT INTO trade_alerts (user_id, asset_name, ...)
   ```

2. **Check edge function logs:**
   - Look for "Log to analytics" messages
   - Check for any errors

3. **Verify RLS policies allow SERVICE_ROLE:**
   ```sql
   SELECT * FROM notification_analytics LIMIT 1;
   ```

---

## 📝 **POST-DEPLOYMENT CHECKLIST**

- [ ] All 6 functions deployed
- [ ] New version numbers confirmed
- [ ] Test signal created
- [ ] Analytics table populated
- [ ] Dashboard showing data
- [ ] Failure reasons logged

---

## 🏆 **NEXT STEPS AFTER DEPLOYMENT**

1. **Monitor Dashboard** - Should show attempted notifications
2. **Wait for Users** - Users need to login and get Player IDs
3. **Track Adoption** - Monitor Player ID count
4. **Test Delivery** - Once Player IDs exist, test actual push delivery

---

**Deployment Ready:** ✅ YES  
**Code Status:** ✅ FIXED  
**Next Action:** Deploy via Dashboard or CLI  
**ETA:** 10-15 minutes for all 6 functions

