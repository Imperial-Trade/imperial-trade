# 🔐 SET ONESIGNAL SECRETS IN SUPABASE

## 🎯 **CURRENT OneSignal App ID**

**App ID:** `3ea69bee-8061-4dd7-8053-fc95779b0f1e`

**Safari Web ID:** `web.onesignal.auto.3ea69bee-8061-4dd7-8053-fc95779b0f1e`

---

## ⚠️ **CRITICAL: Set These Secrets in Supabase**

### **Edge Functions Need These Environment Variables:**

1. **ONESIGNAL_APP_ID**
2. **ONESIGNAL_API_KEY**

**Without these, edge functions can't send push notifications!**

---

## 🔧 **HOW TO SET SECRETS**

### **Method 1: Supabase Dashboard (Easiest)**

1. **Go to:** https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/settings/vault

2. **Click "New Secret"**

3. **Add Secret #1:**
   - Name: `ONESIGNAL_APP_ID`
   - Value: `3ea69bee-8061-4dd7-8053-fc95779b0f1e`
   - Click "Add Secret"

4. **Add Secret #2:**
   - Name: `ONESIGNAL_API_KEY`
   - Value: **[YOUR ONESIGNAL REST API KEY]**
   - Click "Add Secret"

---

### **Method 2: Supabase CLI**

```bash
# Set OneSignal App ID
npx supabase secrets set ONESIGNAL_APP_ID="3ea69bee-8061-4dd7-8053-fc95779b0f1e" --project-ref kmuoqkcxguafxulqlbmi

# Set OneSignal API Key (get from OneSignal dashboard)
npx supabase secrets set ONESIGNAL_API_KEY="YOUR_REST_API_KEY_HERE" --project-ref kmuoqkcxguafxulqlbmi
```

---

## 🔑 **WHERE TO GET ONESIGNAL_API_KEY**

1. **Go to:** https://onesignal.com/
2. **Login to your account**
3. **Select your app:** Trade Imperial
4. **Settings → Keys & IDs**
5. **Copy "REST API Key"**
6. **Use that value for ONESIGNAL_API_KEY**

---

## ✅ **VERIFY SECRETS ARE SET**

**After setting secrets, verify in edge function logs:**

Create a test signal and check edge function logs for:
```
✅ [OneSignal] App ID configured
✅ [OneSignal] Sending push notification
```

**If you see:**
```
⚠️ OneSignal not configured - skipping push
```

**Then secrets are NOT set!**

---

## 📊 **CURRENT STATUS**

**App ID in Code:**
- ✅ index.html: `3ea69bee-8061-4dd7-8053-fc95779b0f1e`
- ✅ useOneSignal.ts: `3ea69bee-8061-4dd7-8053-fc95779b0f1e`
- ✅ Edge functions: Using `Deno.env.get('ONESIGNAL_APP_ID')`

**Secrets Status:**
- ⏳ Unknown - need to verify in Supabase

---

## 🎯 **ACTION REQUIRED**

**You need to:**
1. Go to OneSignal dashboard
2. Get REST API Key
3. Set both secrets in Supabase
4. **OR** tell me the REST API Key and I can help format the command

**Without these secrets, push notifications can't be sent by edge functions!**

---

**Set the secrets in Supabase vault:**
https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/settings/vault

