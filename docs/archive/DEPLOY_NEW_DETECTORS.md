# 🚀 DEPLOY NEW DETECTOR SYSTEM

## ✅ **WHAT WE BUILT**

We replaced the old centralized monitors with **7 separate detector functions**:

1. ✅ `tp1-detector` - Monitors TP1 hits
2. ✅ `tp2-detector` - Monitors TP2 hits
3. ✅ `tp3-detector` - Monitors TP3 hits
4. ✅ `tp4-detector` - Monitors TP4 hits
5. ✅ `tp5-detector` - Monitors TP5 hits (can close signal if all TPs hit)
6. ✅ `stop-loss-detector` - Monitors stop loss hits
7. ✅ `limit-activation-detector` - Monitors pending limit orders

**Old monitors deleted**: `priority-alert-monitor`, `order-trigger-monitor`

---

## 🎯 **STEP-BY-STEP DEPLOYMENT**

### **STEP 1: Merge to Main** ✅

```bash
# You've already pushed to feature/notification-dedup-fix
# Now merge the PR in GitHub
```

1. Go to: https://github.com/Imperial-Trade/imperial-trade/pulls
2. Find PR for `feature/notification-dedup-fix`
3. Review changes (11 files changed)
4. Click **"Merge pull request"**
5. Wait for Lovable to auto-deploy (1-2 minutes)

---

### **STEP 2: Verify Deployment** ⏳

After Lovable auto-deploys:

1. Go to: https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/functions
2. Verify you see these **7 NEW functions**:
   - ✅ `tp1-detector`
   - ✅ `tp2-detector`
   - ✅ `tp3-detector`
   - ✅ `tp4-detector`
   - ✅ `tp5-detector`
   - ✅ `stop-loss-detector`
   - ✅ `limit-activation-detector`

3. Verify these **OLD functions are GONE**:
   - ❌ `priority-alert-monitor` (should be deleted)
   - ❌ `order-trigger-monitor` (should be deleted)

4. Verify this **KEPT function** still exists:
   - ✅ `price-ingestor` (should still be there)

---

### **STEP 3: Set Up Cron Scheduling** ⏳

**CRITICAL**: Detectors need to run periodically to work!

#### **Option A: Supabase pg_cron (Recommended)**

1. Go to: https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/sql
2. Run this SQL to enable cron:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Get your project URL and service role key first
-- URL: https://kmuoqkcxguafxulqlbmi.supabase.co
-- Service Role Key: From Supabase Dashboard → Settings → API

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

-- Schedule Stop Loss Detector (every 10 seconds - CRITICAL!)
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

**Replace `YOUR_SERVICE_ROLE_KEY` with your actual service role key:**
- Go to: https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/settings/api
- Copy **"service_role" secret key**
- Paste in SQL above

3. Verify cron jobs are scheduled:

```sql
SELECT * FROM cron.job ORDER BY jobname;
```

You should see 7 cron jobs (tp1-detector-cron, tp2-detector-cron, etc.)

---

#### **Option B: External Cron (If pg_cron doesn't work)**

If Supabase pg_cron is not available on your plan, use an external cron service:

**Services**:
- GitHub Actions (free for public repos)
- Render Cron Jobs (free tier)
- EasyCron (free tier)

**Example with Render**:
1. Go to https://render.com
2. Create 7 Cron Jobs
3. Set URLs:
   - `https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/tp1-detector`
   - `https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/tp2-detector`
   - etc.
4. Add header: `Authorization: Bearer YOUR_SERVICE_ROLE_KEY`
5. Schedule: Every 15-30 seconds

---

### **STEP 4: Test Each Detector** ⏳

#### **Manual Test (Before Cron)**:

Test each detector manually to ensure they work:

```bash
# Test TP1 Detector
curl -X POST \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/tp1-detector

# Expected Response:
# {
#   "success": true,
#   "detector": "tp1-detector",
#   "signals_monitored": 5,
#   "tp1_hits_detected": 0,
#   "timestamp": "2025-11-10T03:30:00.000Z"
# }
```

**Test all 7 detectors**:
- `tp1-detector`
- `tp2-detector`
- `tp3-detector`
- `tp4-detector`
- `tp5-detector`
- `stop-loss-detector`
- `limit-activation-detector`

#### **Live Test (After Cron)**:

1. Create a test signal with TP1 close to current price
2. Wait 15-30 seconds for detector to run
3. Check if notification appears ✅
4. Check edge function logs for detector execution

---

### **STEP 5: Monitor Logs** ⏳

After deployment, monitor logs:

1. Go to: https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/logs/edge-functions
2. Filter by function name (e.g., `tp1-detector`)
3. Look for:
   - ✅ `🎯 [TP1 Detector] Starting detection cycle...`
   - ✅ `🔍 [TP1 Detector] Monitoring X signals`
   - ✅ `✅ [TP1 Detector] Updated signal 123 - TP1 marked as hit`

---

## 🎉 **EXPECTED RESULT**

After deployment + cron setup:

✅ **TP hits detected automatically**  
✅ **Stop losses detected automatically**  
✅ **Limit orders activated automatically**  
✅ **ONE notification per event** (no duplicates)  
✅ **Robust system** (one failure doesn't break others)  
✅ **Easy debugging** (know exactly which detector failed)

---

## 🔧 **TROUBLESHOOTING**

### **Detector not running?**
- Check cron jobs are scheduled: `SELECT * FROM cron.job`
- Check function is deployed: Supabase Dashboard → Edge Functions
- Test manually with curl

### **Detector running but not detecting?**
- Check `market_prices` table has recent data
- Check `price-ingestor` is still running
- Check detector logs for errors

### **Notifications not appearing?**
- Detectors only update `trade_alerts`
- Notifications are sent by database trigger → `notify-*` functions
- Check `instant_notification_router` trigger is active

---

## 📊 **FINAL SYSTEM ARCHITECTURE**

```
price-ingestor → market_prices table
                      ↓
        7 Detector Functions (cron)
                      ↓
              trade_alerts table
                      ↓
     instant_notification_router (trigger)
                      ↓
        notify-* Edge Functions (10)
                      ↓
        ModernNotificationSystem UI
```

---

**Status**: ✅ **CODE COMPLETE - READY TO DEPLOY**

---

**Next Steps**:
1. ⏳ Merge PR to main
2. ⏳ Verify deployment in Supabase
3. ⏳ Set up cron scheduling
4. ⏳ Test each detector
5. ⏳ Monitor logs
6. ✅ Enjoy robust notifications! 🎉

