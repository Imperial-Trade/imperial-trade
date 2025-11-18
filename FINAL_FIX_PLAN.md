# 🎯 FINAL FIX PLAN - ONESIGNAL 401 UNAUTHORIZED

## 🚨 ROOT CAUSE IDENTIFIED:

**Edge Function Log:**
```
POST | 401 Unauthorized | send-welcome-notification
```

**This means:** The OneSignal API Key in Supabase secrets is **INVALID or WRONG**!

---

## ✅ THE SOLUTION:

We need to get the CORRECT OneSignal REST API Key from your OneSignal dashboard and update it in Supabase.

---

## 📋 STEP-BY-STEP FIX:

### **STEP 1: Get the Correct OneSignal API Key**

1. **Go to:** https://dashboard.onesignal.com/
2. **Select your app:** "Trade Imperial" (App ID: `c6d5466e-9ca7-40b2-90db-57ec42d385ef`)
3. **Click:** Settings → Keys & IDs
4. **Copy:** REST API Key (looks like: `os_v2_app_...` or similar)

---

### **STEP 2: Update Supabase Secret**

Run this command with the REAL API key:

```powershell
cd "C:\Users\Jacob Estayo\Trade imperial\imperial-trade"
supabase secrets set ONESIGNAL_API_KEY="YOUR_ACTUAL_API_KEY_HERE"
```

---

### **STEP 3: Redeploy Edge Function**

```powershell
supabase functions deploy send-welcome-notification
```

---

### **STEP 4: Test Again**

Paste this in browser console:

```javascript
(async () => {
  const playerId = await OneSignal.User.PushSubscription.id;
  const response = await fetch('https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/send-welcome-notification', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW9xa2N4Z3VhZnh1bHFsYm1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4NjkyNTAsImV4cCI6MjA2NzQ0NTI1MH0.QkFTkUlkQvYdPnPMKU4J7gBKf8RXZ_UjPtjSgvHBRVo'
    },
    body: JSON.stringify({
      player_id: playerId,
      user_id: 'test-user',
      user_name: 'Test User'
    })
  });
  const result = await response.json();
  console.log('Test result:', result);
})();
```

---

## 🎯 EXPECTED RESULT:

After updating the API key, you should see:
- ✅ `POST | 200 | send-welcome-notification` in logs (not 401)
- ✅ Notification appears in your notification center
- ✅ Everything works!

---

## 📝 IMPORTANT NOTES:

1. **The OneSignal REST API Key is different from the App ID**
2. **It usually starts with** `os_v2_app_` or is a long alphanumeric string
3. **You can find it in:** OneSignal Dashboard → Settings → Keys & IDs → REST API Key
4. **Keep it secret!** Don't share it publicly

---

## 🚀 NEXT STEPS:

1. Go to OneSignal dashboard NOW
2. Copy the REST API Key
3. Run the `supabase secrets set` command
4. Test again

**This is THE FIX!** Once the correct API key is in Supabase, notifications will work on ALL devices! 🎉

