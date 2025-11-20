# 🚀 Edge Function Deployment Guide

## ⚠️ **CRITICAL: Edge Functions Need Redeployment**

The fixed `notification-core.ts` code is in GitHub but **not yet deployed** to Supabase edge functions.

**Current State:**
- ✅ Fix committed to GitHub (commit `5316f96c`)
- ❌ Old version still running in production
- ❌ All notifications still failing

**After Deployment:**
- ✅ Notifications will work
- ✅ Player IDs will be fetched correctly
- ✅ Push notifications will be sent

---

## 🎯 **Option 1: Automated Script (Recommended)**

### **Windows (PowerShell):**

```powershell
# Run from imperial-trade directory:
.\deploy-edge-functions.ps1
```

### **Mac/Linux (Bash):**

```bash
# Run from imperial-trade directory:
./deploy-edge-functions.sh
```

---

## 🎯 **Option 2: Manual Deployment via CLI**

### **Prerequisites:**

1. **Install Supabase CLI:**
```bash
npm install -g supabase
```

2. **Login to Supabase:**
```bash
supabase login
```

3. **Link to your project:**
```bash
cd imperial-trade
supabase link --project-ref kmuoqkcxguafxulqlbmi
```

### **Deploy Each Function:**

```bash
# Deploy all 6 functions:
supabase functions deploy notify-signal-created
supabase functions deploy notify-tp-hit
supabase functions deploy notify-stop-loss-hit
supabase functions deploy notify-signal-closed
supabase functions deploy notify-limit-activated
supabase functions deploy notify-notes-updated
```

**Expected Output (per function):**
```
✓ Bundled function notify-signal-created
✓ Deployed function notify-signal-created (version: 224)
```

---

## 🎯 **Option 3: Deploy via Supabase Dashboard**

### **Steps:**

1. **Go to:** https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/functions

2. **For EACH function:**
   - Click the function name
   - Click "Deploy"
   - Wait for deployment to complete

3. **Functions to deploy:**
   - `notify-signal-created`
   - `notify-tp-hit`
   - `notify-stop-loss-hit`
   - `notify-signal-closed`
   - `notify-limit-activated`
   - `notify-notes-updated`

---

## ✅ **Verify Deployment**

### **Check Function Versions:**

```sql
-- In Supabase SQL Editor, check if functions are updated:
-- (Look for version numbers > 220, should be 224+)
```

Or via CLI:
```bash
supabase functions list
```

### **Check Function Logs:**

1. Go to: https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/logs/edge-functions

2. Create a test trade alert

3. Look for these log lines:
```
📋 [OneSignal] Fetching Player IDs for X users
📋 [Player IDs] Found Y Player IDs
✅ [OneSignal] Push sent successfully
```

If you see these, **IT'S WORKING!** 🎉

---

## 🧪 **Post-Deployment Testing**

### **Step 1: Get a Player ID**

1. **Clear localStorage:**
```javascript
// In browser console:
localStorage.clear();
```

2. **Logout and login**

3. **Airbnb modal should appear** (wait 2 seconds)

4. **Select notification types** (all selected by default)

5. **Click "Yes, notify me"**

6. **Check if Player ID was saved:**
```sql
SELECT id, email, device_token, xeon_stream_subscription 
FROM profiles 
WHERE id = 'YOUR_USER_ID';
```

**Expected Result:**
- `device_token` should have a value (OneSignal Player ID)
- `xeon_stream_subscription` should be `true`

---

### **Step 2: Test End-to-End**

1. **Create a trade alert** (via admin panel)

2. **Check notification_analytics:**
```sql
SELECT 
  user_id,
  notification_type,
  onesignal_notification_id,
  sent_at,
  delivered_at,
  failure_reason
FROM notification_analytics 
ORDER BY sent_at DESC 
LIMIT 10;
```

**Expected Result:**
- `delivered_at` should be populated
- No `failure_reason`
- `user_id` should be a UUID (not a JSON object)

3. **Check your device** - you should receive a push notification!

---

## 🚨 **Troubleshooting**

### **"Supabase CLI not found"**

**Solution:**
```bash
npm install -g supabase
# or
brew install supabase/tap/supabase  # Mac
```

---

### **"Not linked to a project"**

**Solution:**
```bash
cd imperial-trade
supabase link --project-ref kmuoqkcxguafxulqlbmi
```

---

### **"Authentication required"**

**Solution:**
```bash
supabase login
# Follow the prompts
```

---

### **"Functions still failing after deployment"**

1. **Check function logs** in Supabase dashboard
2. **Verify Player IDs exist** in database:
```sql
SELECT COUNT(*) FROM profiles WHERE device_token IS NOT NULL;
```
3. **Check notification preferences:**
```sql
SELECT * FROM notification_preferences LIMIT 5;
```
4. **Create a test alert** and check edge function logs

---

## 📊 **Expected Timeline**

1. **Deploy edge functions:** 2-5 minutes (for all 6)
2. **Users get Player IDs:** Immediate (on next login)
3. **First notifications sent:** Immediate (after Player ID assigned)

---

## 🎉 **Success Criteria**

You'll know it's working when:

1. ✅ `device_token` column is populated for subscribed users
2. ✅ `notification_analytics` shows `delivered_at` timestamps
3. ✅ No `failure_reason` in analytics
4. ✅ You receive push notifications on your device
5. ✅ Dashboard shows delivery metrics

---

## 📝 **After Successful Deployment**

Create a GitHub issue or update your project docs with:

- ✅ Deployment date/time
- ✅ Deployed function versions
- ✅ Number of users with Player IDs
- ✅ First successful notification timestamp

---

**Once deployed, your push notification system will be FULLY OPERATIONAL.** 🚀

---

*Last Updated: November 20, 2025*  
*Commit: `5316f96c`*  
*Branch: `main`*

