# 🔐 ONESIGNAL CREDENTIALS DIAGNOSTIC

## 🚨 **CRITICAL: OneSignal Secrets Not Working**

Based on the logs, the `send-welcome-notification` Edge Function is **only receiving OPTIONS (preflight) requests** but **NO POST requests**. This means the frontend is failing before it can even send the actual request.

---

## 📋 **Current Status**

### ✅ **Code is Correct**
Both Edge Function files are using the correct environment variable names:
- ✅ `ONESIGNAL_API_KEY` (not `ONESIGNAL_REST_API_KEY`)
- ✅ `ONESIGNAL_APP_ID`

**Files using these:**
1. `supabase/functions/send-welcome-notification/index.ts` (line 51-52)
2. `supabase/functions/_shared/notification-core.ts` (line 361-362)

### ❌ **Supabase Secrets May Be Missing or Wrong**

The Edge Functions are deployed, but they need the secrets to be set in Supabase.

---

## 🔧 **HOW TO FIX - CHECK & SET SUPABASE SECRETS**

### **Step 1: Check Current Secrets in Supabase Dashboard**

1. Go to: **https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/settings/vault/secrets**
2. Look for these two secrets:
   - `ONESIGNAL_API_KEY`
   - `ONESIGNAL_APP_ID`

3. **Expected Values**:
   - `ONESIGNAL_APP_ID`: `c6d5466e-9ca7-40b2-90db-57ec42d385ef` (from your `index.html`)
   - `ONESIGNAL_API_KEY`: Your OneSignal REST API Key (from OneSignal Dashboard)

---

### **Step 2: Get OneSignal REST API Key**

1. Go to: **https://dashboard.onesignal.com/apps**
2. Click on your **Trade Imperial** app
3. Go to: **Settings → Keys & IDs**
4. Copy the **REST API Key**

**Screenshot Location**: Should show:
- App ID: `c6d5466e-9ca7-40b2-90db-57ec42d385ef`
- REST API Key: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

---

### **Step 3: Set Secrets in Supabase (Two Options)**

#### **Option A: Via Supabase Dashboard (RECOMMENDED)**

1. Go to: **https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/settings/vault/secrets**
2. Click **New Secret**
3. Add these two secrets:

**Secret 1:**
- Name: `ONESIGNAL_APP_ID`
- Value: `c6d5466e-9ca7-40b2-90db-57ec42d385ef`

**Secret 2:**
- Name: `ONESIGNAL_API_KEY`
- Value: `[YOUR_REST_API_KEY_FROM_ONESIGNAL]`

4. Click **Save** for each

#### **Option B: Via Supabase CLI**

Run these commands in PowerShell:

```powershell
# Set ONESIGNAL_APP_ID
supabase secrets set ONESIGNAL_APP_ID=c6d5466e-9ca7-40b2-90db-57ec42d385ef

# Set ONESIGNAL_API_KEY (replace with your actual key)
supabase secrets set ONESIGNAL_API_KEY=your-actual-rest-api-key-here
```

---

### **Step 4: Verify Secrets Are Set**

Run this command to list all secrets:

```powershell
supabase secrets list
```

**Expected Output:**
```
ONESIGNAL_APP_ID
ONESIGNAL_API_KEY
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

---

### **Step 5: Redeploy Edge Functions (CRITICAL)**

After setting secrets, you **MUST** redeploy the Edge Functions for them to pick up the new secrets:

```powershell
# Redeploy send-welcome-notification
supabase functions deploy send-welcome-notification --no-verify-jwt

# Redeploy notification-core functions (these also use OneSignal)
supabase functions deploy notify-signal-created --no-verify-jwt
supabase functions deploy notify-signal-closed --no-verify-jwt
supabase functions deploy notify-tp-hit --no-verify-jwt
supabase functions deploy notify-tp1-hit --no-verify-jwt
supabase functions deploy notify-tp2-hit --no-verify-jwt
supabase functions deploy notify-tp3-hit --no-verify-jwt
supabase functions deploy notify-tp4-hit --no-verify-jwt
supabase functions deploy notify-tp5-hit --no-verify-jwt
supabase functions deploy notify-stop-loss-hit --no-verify-jwt
supabase functions deploy notify-limit-activated --no-verify-jwt
supabase functions deploy notify-notes-updated --no-verify-jwt
```

---

### **Step 6: Test Welcome Notification**

1. Clear browser cache (Ctrl+Shift+Delete)
2. Refresh Signal Stream (Ctrl+F5)
3. Click bell icon → Subscribe
4. Allow native prompt
5. **Check Console (F12)** for:
   - ✅ `✅ Successfully subscribed with Player ID: xxx`
   - ✅ `📤 Sending welcome push notification...`
   - ✅ `✅ [Welcome Notification] Sent successfully`
6. **Check Windows Notification Center** (lower right):
   - Should see: "Welcome to Trade Imperial - You are now Subscribed to receive alerts"

---

## 🔍 **How to Debug If Still Not Working**

### **Check Edge Function Logs:**

```powershell
# View logs in real-time
supabase functions logs send-welcome-notification --tail
```

**Expected Output (SUCCESS):**
```
👋 [Welcome Notification] Sending to: { player_id: 'aa76ee73...', user_id: '...' }
📤 [Welcome Notification] Sending to OneSignal...
✅ [Welcome Notification] Sent successfully: { notification_id: '...', recipients: 1 }
```

**Expected Output (FAILURE - Missing Secrets):**
```
❌ Missing OneSignal credentials: { hasAppId: false, hasApiKey: false }
```

**Expected Output (FAILURE - Wrong API Key):**
```
❌ [Welcome Notification] OneSignal error: { errors: ['Invalid API Key'] }
```

---

## 📊 **Current Issue Summary**

| Component | Status | Issue |
|-----------|--------|-------|
| Code (`send-welcome-notification`) | ✅ Correct | Using `ONESIGNAL_API_KEY` |
| Code (`notification-core.ts`) | ✅ Correct | Using `ONESIGNAL_API_KEY` |
| Edge Function Deployment | ✅ Deployed | Version 7 active |
| **Supabase Secrets** | ❌ **UNKNOWN** | **Need to verify & set** |
| Frontend Call | ❌ Failing | Stops at OPTIONS (CORS preflight) |

---

## 🎯 **Action Required**

1. **CHECK** OneSignal REST API Key in OneSignal Dashboard
2. **SET** `ONESIGNAL_API_KEY` and `ONESIGNAL_APP_ID` secrets in Supabase
3. **REDEPLOY** all 11 notification Edge Functions
4. **TEST** welcome notification

---

## 📞 **Need Help?**

If you see this error in logs:
```
❌ Missing OneSignal credentials
```

Then the secrets are **NOT SET** in Supabase. Follow Step 3 above.

If you see this error in logs:
```
❌ OneSignal error: Invalid API Key
```

Then the `ONESIGNAL_API_KEY` is **WRONG**. Get the correct REST API Key from OneSignal and update it.

---

**🚨 CRITICAL: Without correct secrets, push notifications will NEVER work! 🚨**

