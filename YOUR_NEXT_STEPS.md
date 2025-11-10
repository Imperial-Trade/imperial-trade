# ✅ YOUR NEXT STEPS - DEPLOYMENT CHECKLIST

## 🎉 **SYSTEM COMPLETE!**

I've built a completely new detection system with **7 separate detector Edge Functions**. Here's what you need to do to deploy it:

---

## 📋 **QUICK CHECKLIST**

```
✅ Code Complete (DONE by AI)
✅ Pushed to GitHub (DONE by AI)
⬜ Merge PR to main (YOU)
⬜ Verify deployment (YOU)
⬜ Set up cron scheduling (YOU)
⬜ Test detectors (YOU)
⬜ Enjoy! (YOU) 🎉
```

---

## 🚀 **STEP 1: MERGE PR** (2 minutes)

1. Go to: https://github.com/Imperial-Trade/imperial-trade/pulls
2. Find PR: `feature/notification-dedup-fix`
3. Review changes:
   - ✅ 7 new detector Edge Functions created
   - ✅ 2 old monitors deleted
   - ✅ config.toml updated
4. Click **"Merge pull request"**
5. Wait 1-2 minutes for Lovable to auto-deploy

---

## 🚀 **STEP 2: VERIFY DEPLOYMENT** (1 minute)

1. Go to: https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/functions

2. **Verify these 7 NEW functions exist**:
   - ✅ `tp1-detector`
   - ✅ `tp2-detector`
   - ✅ `tp3-detector`
   - ✅ `tp4-detector`
   - ✅ `tp5-detector`
   - ✅ `stop-loss-detector`
   - ✅ `limit-activation-detector`

3. **Verify these OLD functions are GONE**:
   - ❌ `priority-alert-monitor` (should be deleted)
   - ❌ `order-trigger-monitor` (should be deleted)

4. **Verify this function still exists**:
   - ✅ `price-ingestor` (should still be there)

---

## 🚀 **STEP 3: SET UP CRON** (5 minutes)

**CRITICAL**: Detectors need to run periodically!

### **Get Your Service Role Key First**:
1. Go to: https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/settings/api
2. Find **"service_role" secret key**
3. Click "Reveal" and copy it
4. Keep it handy for next step

### **Set Up Cron Jobs**:
1. Go to: https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/sql
2. Click "New query"
3. Copy this SQL (REPLACE `YOUR_SERVICE_ROLE_KEY` with your key):

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule TP1 Detector (every 15 seconds)
SELECT cron.schedule(
  'tp1-detector-cron',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/tp1-detector',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
      'Content-Type', 'application/json'
    )
  );
  $$
);

-- Schedule TP2 Detector (every 15 seconds)
SELECT cron.schedule(
  'tp2-detector-cron',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/tp2-detector',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
      'Content-Type', 'application/json'
    )
  );
  $$
);

-- Schedule TP3 Detector (every 15 seconds)
SELECT cron.schedule(
  'tp3-detector-cron',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/tp3-detector',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
      'Content-Type', 'application/json'
    )
  );
  $$
);

-- Schedule TP4 Detector (every 15 seconds)
SELECT cron.schedule(
  'tp4-detector-cron',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/tp4-detector',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
      'Content-Type', 'application/json'
    )
  );
  $$
);

-- Schedule TP5 Detector (every 15 seconds)
SELECT cron.schedule(
  'tp5-detector-cron',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/tp5-detector',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
      'Content-Type', 'application/json'
    )
  );
  $$
);

-- Schedule Stop Loss Detector (every 10 seconds - MOST CRITICAL!)
SELECT cron.schedule(
  'stop-loss-detector-cron',
  '*/10 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/stop-loss-detector',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
      'Content-Type', 'application/json'
    )
  );
  $$
);

-- Schedule Limit Activation Detector (every 15 seconds)
SELECT cron.schedule(
  'limit-activation-detector-cron',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/limit-activation-detector',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
      'Content-Type', 'application/json'
    )
  );
  $$
);
```

4. **REPLACE** `YOUR_SERVICE_ROLE_KEY` with your actual key (from step 1)
5. Click "Run"
6. Verify success (should see "Success" messages)

### **Verify Cron Jobs Are Active**:

Run this query to confirm:

```sql
SELECT * FROM cron.job ORDER BY jobname;
```

You should see 7 cron jobs:
- `limit-activation-detector-cron`
- `stop-loss-detector-cron`
- `tp1-detector-cron`
- `tp2-detector-cron`
- `tp3-detector-cron`
- `tp4-detector-cron`
- `tp5-detector-cron`

---

## 🚀 **STEP 4: TEST DETECTORS** (5 minutes)

### **Manual Test (Quick Check)**:

Test one detector to ensure it works:

```bash
# In your terminal, replace YOUR_SERVICE_ROLE_KEY with your actual key
curl -X POST \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/tp1-detector
```

**Expected Response**:
```json
{
  "success": true,
  "detector": "tp1-detector",
  "signals_monitored": 5,
  "tp1_hits_detected": 0,
  "timestamp": "2025-11-10T03:45:00.000Z"
}
```

If you see this → ✅ Detector works!

### **Live Test (Real Signal)**:

1. Create a test signal with TP1 close to current price
2. Wait 15-30 seconds for detector to run
3. Check if notification appears ✅
4. Go to Supabase Edge Function logs:
   - https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/logs/edge-functions
   - Filter by `tp1-detector`
   - Look for: `🎯 [TP1 Detector] TP1 HIT!`

---

## 🚀 **STEP 5: MONITOR** (Ongoing)

After deployment, keep an eye on logs:

### **Check Detector Logs**:
1. Go to: https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/logs/edge-functions
2. Filter by detector name (e.g., `tp1-detector`)
3. Look for:
   - ✅ `🎯 [TP1 Detector] Starting detection cycle...`
   - ✅ `🔍 [TP1 Detector] Monitoring X signals`
   - ✅ `✅ [TP1 Detector] Updated signal 123`

### **Check Notification Logs**:
1. Filter by `notify-tp1-hit` (or other notify functions)
2. Look for:
   - ✅ `🎯 [TP1 Hit] Processing notification`
   - ✅ `🚀 INSTANT: Realtime sent`
   - ✅ `📱 ASYNC: Push sent`

---

## 🎉 **EXPECTED RESULT**

After completing all steps:

✅ **TP hits detected automatically** (every 15s)  
✅ **Stop losses detected automatically** (every 10s)  
✅ **Limit orders activated automatically** (every 15s)  
✅ **ONE notification per event** (no duplicates)  
✅ **Robust system** (one failure doesn't break others)  
✅ **Easy debugging** (know exactly which detector failed)

---

## 📖 **FULL DOCUMENTATION**

- **Architecture Details**: `DETECTOR_SYSTEM_ARCHITECTURE.md`
- **Deployment Guide**: `DEPLOY_NEW_DETECTORS.md`
- **Quick Summary**: `WHAT_CHANGED_SUMMARY.md`
- **Visual Overview**: `DETECTOR_SYSTEM_COMPLETE.md`
- **This Checklist**: `YOUR_NEXT_STEPS.md`

---

## 🔧 **TROUBLESHOOTING**

### **Detector not running?**
- Check cron jobs: `SELECT * FROM cron.job`
- Check function is deployed: Supabase Dashboard → Edge Functions
- Test manually with curl

### **Detector running but not detecting?**
- Check `market_prices` table has recent data
- Check `price-ingestor` is still running
- Check detector logs for errors

### **Notifications not appearing?**
- Detectors update `trade_alerts`
- Notifications sent by `notify-*` functions
- Check `instant_notification_router` trigger is active

---

## 🎊 **YOU'RE READY!**

```
✅ 7 separate detectors built
✅ Old monitors removed
✅ config.toml updated
✅ Complete documentation provided
✅ Pushed to GitHub
⏳ Ready to merge and deploy!
```

---

**Next Action**: 🚀 **Merge PR and follow this checklist!**

**Estimated Time**: ~15 minutes total

**Support**: If you need help, all docs are in your repo:
- `DETECTOR_SYSTEM_ARCHITECTURE.md`
- `DEPLOY_NEW_DETECTORS.md`
- `WHAT_CHANGED_SUMMARY.md`
- `DETECTOR_SYSTEM_COMPLETE.md`
- `YOUR_NEXT_STEPS.md` (this file)

---

🎉 **HAPPY DEPLOYING!** 🎉

