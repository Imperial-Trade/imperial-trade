# 🔍 Notification Troubleshooting Checklist

## Issue: Notifications Working in Lovable Preview but NOT in Production

### 🎯 **Root Cause Analysis**

The issue is likely one of the following:

---

## ✅ **Checklist to Diagnose the Issue**

### **1. Check Supabase Realtime Channel Subscription**

**In Production Browser Console (F12):**
```javascript
// Should see these logs:
🚨🚨🚨 [ModernNotificationSystem] useEffect FIRED - Setting up Realtime channel! 🚨🚨🚨
🔔 [ModernNotificationSystem] Setting up broadcast listeners (no auth required)
✅ [Realtime] Channel subscribed successfully
```

**If you DON'T see these logs:**
- ❌ Component not mounting
- ❌ Supabase client connection failed
- ❌ Realtime channel blocked by firewall/adblocker

---

### **2. Check Auth Ready State**

**In Production Browser Console:**
```javascript
// Should see:
🔍 [DEBUG] System initialized: {
  userId: "c79a0220-...",
  hasUser: true,
  authLoading: false,
  authReady: true,  // ✅ MUST BE TRUE
  ...
}
```

**If `authReady: false`:**
- ❌ Notifications will be blocked
- ❌ Check `AuthContext.tsx` - profile fetching may be hanging

---

### **3. Check if Broadcasts are Being Sent**

**Test by creating a signal:**
```sql
-- Run this in Supabase SQL Editor
INSERT INTO public.trade_alerts (
    id, user_id, asset_name, trade_type, entry_price, stop_loss,
    tp1, tp2, status, tradermade_symbol, notes
) VALUES (
    gen_random_uuid(),
    'YOUR_USER_ID',  -- Replace with your user ID
    'Gold', 'buy', 2660.00, 2650.00,
    2670.00, 2680.00, 'active', 'XAUUSD', '🧪 Production Test'
);
```

**Expected in Console:**
```
🚨 [ModernNotificationSystem] Received signal notification: { ... }
📤 [Realtime Broadcast] Attempting to send...
✅ [Realtime Broadcast] SUCCESS
```

**If you DON'T see broadcast logs:**
- ❌ Database trigger `instant_notification_router` not firing
- ❌ Edge function not sending broadcast
- ❌ Realtime channel not subscribed

---

### **4. Check Database Trigger Logs**

**In Supabase Dashboard → Database → Functions → Logs:**

Look for:
```
🔔 [INSTANT NOTIFICATION] Starting router for signal: <UUID>
📤 [Realtime Broadcast] Attempting to send...
✅ [Realtime Broadcast] SUCCESS
```

**If you DON'T see these:**
- ❌ Trigger `instant_notification_router` is disabled
- ❌ Trigger has errors (check `pg_stat_statements` for errors)

---

### **5. Check Edge Function Deployment**

**Verify edge functions are deployed:**
```bash
supabase functions list
```

**Expected output:**
```
notify-signal-created (deployed)
notify-signal-closed (deployed)
```

**If NOT deployed:**
```bash
cd imperial-trade
supabase functions deploy notify-signal-created
supabase functions deploy notify-signal-closed
```

---

### **6. Check Environment Variables**

**Production vs. Lovable:**

| Variable | Lovable Preview | Production |
|----------|----------------|------------|
| `SUPABASE_URL` | ✅ Auto-injected | ✅ Hardcoded in `client.ts` |
| `SUPABASE_ANON_KEY` | ✅ Auto-injected | ✅ Hardcoded in `client.ts` |
| `hostname` check | `lovableproject.com` | `tradeimperial.com` |

**Check in Production Console:**
```javascript
// Should see:
🔗 Supabase Client Configuration: {
  url: "https://kmuoqkcxguafxulqlbmi.supabase.co",
  keyConfigured: true,
  source: "environment"
}
```

---

### **7. Check Hostname Detection**

**In Production Console:**
```javascript
console.log(window.location.hostname);
// Expected: "tradeimperial.com" or "www.tradeimperial.com"
```

**Check `useOneSignalPush.ts` (lines 33-36):**
```typescript
const hostname = window.location.hostname;
const isProduction = hostname === 'tradeimperial.com' || hostname === 'www.tradeimperial.com';
const isStaging = hostname.includes('lovableproject.com') || hostname.includes('vercel.app') || hostname.includes('netlify.app');
```

**If hostname doesn't match:**
- ❌ OneSignal may not initialize
- ❌ But Realtime should still work!

---

### **8. Check Browser Cache**

**Clear production cache:**
```
1. Open DevTools (F12)
2. Right-click Refresh button → "Empty Cache and Hard Reload"
3. Or: Ctrl+Shift+Delete → Clear cache
```

**Why?**
- Old JavaScript bundle may be cached
- Service Worker may serve stale code

---

### **9. Check Build Timestamp**

**In Production HTML source:**
```html
<!-- Build: 2025-11-11T18:00:00Z - Notification Bell Update -->
```

**In `index.html` (line 133):**
```html
<!-- Build: 2025-11-11T18:00:00Z - Notification Bell Update -->
```

**If timestamps don't match:**
- ❌ Old build is deployed
- ❌ Run new deployment

---

### **10. Check Network Tab for Realtime WebSocket**

**In Production DevTools → Network → WS (WebSocket):**

Look for:
```
wss://kmuoqkcxguafxulqlbmi.supabase.co/realtime/v1/websocket
Status: 101 Switching Protocols (green)
```

**If RED or missing:**
- ❌ WebSocket connection failed
- ❌ Firewall blocking WebSocket
- ❌ Adblocker blocking Supabase

---

## 🔧 **Most Likely Causes (in order)**

### **1. Production Build Not Deployed (80% probability)**
**Symptom:** Old JavaScript code still running
**Fix:**
```bash
# Re-deploy to production
git push origin main  # Trigger CI/CD
# Or manually rebuild
npm run build
# Deploy dist/ folder
```

---

### **2. Browser Cache (10% probability)**
**Symptom:** Service Worker serving old code
**Fix:**
```
DevTools → Application → Clear storage → Clear site data
Hard refresh: Ctrl+Shift+R
```

---

### **3. Supabase Realtime Not Connecting (5% probability)**
**Symptom:** WebSocket connection fails
**Fix:**
- Check firewall/network settings
- Disable adblockers
- Check Supabase dashboard for outages

---

### **4. Database Trigger Disabled (3% probability)**
**Symptom:** No broadcasts sent from backend
**Fix:**
```sql
-- Check trigger status
SELECT tgname, tgenabled 
FROM pg_trigger 
WHERE tgname = 'instant_notification_router';

-- If disabled, enable it:
ALTER TABLE trade_alerts ENABLE TRIGGER instant_notification_router;
```

---

### **5. Auth State Issue (2% probability)**
**Symptom:** `authReady = false` blocks notifications
**Fix:**
Check `AuthContext.tsx` - ensure `setLoading(false)` is called immediately after session load

---

## 🧪 **Quick Test Script**

**Paste in Production Console:**
```javascript
// 1. Check if component is mounted
console.log('Component mounted:', (window as any).notificationSystemMounted);

// 2. Check Supabase connection
console.log('Supabase URL:', window.supabase?.supabaseUrl);

// 3. Check Realtime channel
console.log('Realtime channels:', window.supabase?.getChannels());

// 4. Check auth state
console.log('Auth state:', {
  user: (window as any).currentUser,
  authReady: (window as any).authReady
});

// 5. Manually trigger test notification (if system is initialized)
if (typeof (window as any).addNotification === 'function') {
  (window as any).addNotification({
    type: 'signal_created',
    title: 'Test Notification',
    message: 'If you see this, the system works!',
    metadata: { signal_id: 'test-123' },
    timestamp: new Date()
  });
  console.log('✅ Test notification triggered');
} else {
  console.log('❌ addNotification function not available');
}
```

---

## 📊 **Production vs. Lovable Comparison**

| Feature | Lovable Preview | Production | Issue? |
|---------|----------------|------------|--------|
| **Supabase Client** | ✅ Auto | ✅ Hardcoded | ❓ Check |
| **Realtime Channel** | ✅ Works | ❓ Unknown | ❓ Test |
| **Database Trigger** | ✅ Fires | ❓ Unknown | ❓ Test |
| **Edge Functions** | ✅ Deployed | ❓ Unknown | ❓ Test |
| **Auth Ready** | ✅ Instant | ❓ Unknown | ❓ Test |
| **Build Timestamp** | ✅ Latest | ❓ Old? | ❓ Check |
| **Browser Cache** | ✅ Fresh | ❓ Stale? | ❓ Clear |

---

## 🎯 **Action Plan**

### **Step 1: Check Production Console Logs**
Open `https://tradeimperial.com/dashboard/signal-stream` → F12 → Console

**Look for:**
- [ ] `🚨🚨🚨 [ModernNotificationSystem] useEffect FIRED`
- [ ] `✅ [Realtime] Channel subscribed successfully`
- [ ] `authReady: true` in debug logs
- [ ] `🔗 Supabase Client Configuration` log

### **Step 2: Test Signal Creation**
Create a test signal via SQL and watch console for:
- [ ] `🚨 [ModernNotificationSystem] Received signal notification`
- [ ] `🔔 Playing notification sound`
- [ ] Notification popup appears in top-right corner

### **Step 3: If Still Not Working**
1. Clear browser cache completely
2. Hard refresh (Ctrl+Shift+R)
3. Check Network tab for WebSocket connection
4. Verify database trigger is enabled
5. Re-deploy edge functions

---

## 🚀 **Quick Fix Commands**

```bash
# 1. Re-deploy everything
cd imperial-trade
git pull origin main
supabase db push  # Apply migrations
supabase functions deploy notify-signal-created
supabase functions deploy notify-signal-closed

# 2. Verify trigger is enabled
supabase db execute "ALTER TABLE trade_alerts ENABLE TRIGGER instant_notification_router;"

# 3. Test notification
supabase db execute "INSERT INTO trade_alerts (id, user_id, asset_name, trade_type, entry_price, stop_loss, tp1, status, tradermade_symbol) VALUES (gen_random_uuid(), 'YOUR_USER_ID', 'Test', 'buy', 100, 95, 105, 'active', 'TEST');"
```

---

## 📝 **Report Template**

When reporting the issue, include:

```
Browser: Chrome/Safari/Firefox [version]
URL: https://tradeimperial.com/dashboard/signal-stream
Console Logs: [paste logs here]

Checklist:
[ ] ModernNotificationSystem mounted
[ ] Realtime channel subscribed
[ ] authReady = true
[ ] Test signal created
[ ] Notification received (yes/no)
[ ] Browser cache cleared
[ ] WebSocket connected

Additional Info:
[describe what you see]
```

---

**Created:** November 15, 2025  
**Last Updated:** November 15, 2025

