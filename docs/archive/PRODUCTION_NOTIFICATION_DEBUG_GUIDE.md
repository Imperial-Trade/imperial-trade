# 🚨 Production Notification Debugging Guide

## Issue Report
**Problem:** Modern notification popup and Recent Activity work in Lovable preview but NOT in production

---

## 🎯 Quick Diagnosis (Do This First)

### **Option 1: Use Diagnostic Tool (Recommended)**

1. **Open in Production:**
   ```
   https://tradeimperial.com/diagnostic-test.html
   ```

2. **Run All Tests:**
   - Click each test button in sequence
   - Watch the live console logs
   - Look for RED error messages

3. **Identify the Issue:**
   - ✅ Green = Working
   - ⚠️ Yellow = Warning
   - ❌ Red = Problem found!

---

### **Option 2: Manual Browser Console Check**

1. **Open Production Signal Stream:**
   ```
   https://tradeimperial.com/dashboard/signal-stream
   ```

2. **Open Browser DevTools (F12) → Console**

3. **Look for These Key Logs:**

   **✅ SHOULD SEE:**
   ```
   🚨🚨🚨 [ModernNotificationSystem] useEffect FIRED
   🔔 [ModernNotificationSystem] Setting up broadcast listeners
   ✅ [Realtime] Channel subscribed successfully
   🔍 [DEBUG] System initialized: { authReady: true, ... }
   ```

   **❌ IF YOU SEE:**
   ```
   ❌ Auth not ready
   ❌ WebSocket connection failed
   ❌ Channel subscription timeout
   ⚠️ OneSignal skipped - unsupported domain
   ```

4. **Test by Creating a Signal:**
   - Go to Supabase SQL Editor
   - Run the test SQL from diagnostic checklist
   - Watch console for notification broadcast

---

## 🔍 Most Likely Causes (Ranked)

### **1. Stale Production Build (80% probability)**

**Symptom:**
- Lovable preview has latest code
- Production still running old JavaScript bundle
- No console logs from ModernNotificationSystem

**How to Check:**
```html
<!-- View page source, find this line: -->
<!-- Build: 2025-11-11T18:00:00Z -->

<!-- Compare with index.html in repo -->
```

**Fix:**
```bash
# Re-trigger production deployment
git push origin main

# Or manually rebuild
npm run build
# Then deploy dist/ folder to hosting
```

---

### **2. Browser Cache Issue (10% probability)**

**Symptom:**
- Old service worker serving cached files
- Console shows old log format
- Missing new features

**How to Check:**
```
DevTools → Application → Storage → Clear site data
```

**Fix:**
1. Open DevTools (F12)
2. Right-click refresh button → "Empty Cache and Hard Reload"
3. Or: Ctrl+Shift+Delete → Clear ALL cache
4. Close ALL browser tabs with tradeimperial.com
5. Re-open production site

---

### **3. Realtime WebSocket Not Connecting (5% probability)**

**Symptom:**
- No "Channel subscribed" log
- Network tab shows WebSocket failed (RED)
- Firewall or adblocker blocking

**How to Check:**
```
DevTools → Network → WS tab
Look for: wss://kmuoqkcxguafxulqlbmi.supabase.co/realtime/v1/websocket
Status should be: 101 Switching Protocols (GREEN)
```

**Fix:**
- Disable adblockers (uBlock Origin, AdBlock Plus, etc.)
- Check corporate firewall settings
- Try different network (mobile hotspot)

---

### **4. Database Trigger Disabled (3% probability)**

**Symptom:**
- Console shows channel subscribed ✅
- But no broadcasts received when creating signals
- Edge function logs show no activity

**How to Check:**
```sql
-- Run in Supabase SQL Editor
SELECT tgname, tgenabled 
FROM pg_trigger 
WHERE tgname = 'instant_notification_router';
```

**Fix:**
```sql
-- If disabled (tgenabled = 'D'), enable it:
ALTER TABLE trade_alerts ENABLE TRIGGER instant_notification_router;
```

---

### **5. Auth Ready State False (2% probability)**

**Symptom:**
- Console shows: `authReady: false`
- Notifications blocked by auth check
- Profile fetching hanging

**How to Check:**
```javascript
// Paste in browser console:
console.log((window as any).authReady);
// Should return: true
```

**Fix:**
Check `AuthContext.tsx` - ensure `setLoading(false)` is called immediately after session load

---

## 📋 Step-by-Step Debugging Process

### **Step 1: Verify Environment**
```javascript
// Paste in production console:
console.log('Hostname:', window.location.hostname);
console.log('Expected:', 'tradeimperial.com or www.tradeimperial.com');
```

### **Step 2: Check Supabase Connection**
```javascript
// Should see this log on page load:
🔗 Supabase Client Configuration: {
  url: "https://kmuoqkcxguafxulqlbmi.supabase.co",
  keyConfigured: true
}
```

### **Step 3: Check Realtime Subscription**
```javascript
// Should see within 2 seconds of page load:
✅ [Realtime] Channel subscribed successfully
```

### **Step 4: Check Auth State**
```javascript
// Should see:
🔍 [DEBUG] System initialized: {
  userId: "c79a0220-...",
  authReady: true  // ✅ MUST BE TRUE
}
```

### **Step 5: Test Signal Creation**
```sql
-- Run in Supabase SQL Editor
INSERT INTO public.trade_alerts (
    id, user_id, asset_name, trade_type, entry_price, stop_loss,
    tp1, status, tradermade_symbol, notes
) VALUES (
    gen_random_uuid(),
    'YOUR_USER_ID',  -- Replace with your actual user_id
    'PROD_TEST', 'buy', 9999.00, 9990.00,
    10010.00, 'active', 'TEST', '🧪 Production Test'
);
```

**Expected Console Output:**
```
🚨 [ModernNotificationSystem] Received signal notification
🔔 Playing notification sound
[NOTIFICATION POPUP APPEARS IN TOP-RIGHT]
```

---

## 🛠️ Quick Fix Commands

### **Re-deploy Everything:**
```bash
cd imperial-trade

# Pull latest from main
git pull origin main

# Deploy database migrations
supabase db push

# Deploy edge functions
supabase functions deploy notify-signal-created
supabase functions deploy notify-signal-closed

# Verify trigger is enabled
supabase db execute "
  SELECT tgname, tgenabled 
  FROM pg_trigger 
  WHERE tgname = 'instant_notification_router';
"
```

### **Test Notification Manually:**
```bash
# Create test signal via SQL
supabase db execute "
  INSERT INTO trade_alerts (
    id, user_id, asset_name, trade_type, entry_price, stop_loss,
    tp1, status, tradermade_symbol
  ) VALUES (
    gen_random_uuid(), 
    'YOUR_USER_ID',
    'Test', 'buy', 100, 95, 105, 'active', 'TEST'
  );
"
```

---

## 📊 Comparison: Lovable vs Production

| Check | Lovable Preview | Production | Status |
|-------|----------------|------------|--------|
| **Hostname** | `*.lovableproject.com` | `tradeimperial.com` | ❓ |
| **Build Timestamp** | Latest (auto) | ❓ Check source | ❓ |
| **Supabase Client** | ✅ Auto-injected | ✅ Hardcoded | ✅ |
| **Realtime Channel** | ✅ Subscribed | ❓ Check console | ❓ |
| **Auth Ready** | ✅ Instant | ❓ Check console | ❓ |
| **ModernNotificationSystem** | ✅ Mounted | ❓ Check logs | ❓ |
| **Database Trigger** | ✅ Fires | ❓ Check SQL | ❓ |
| **Edge Functions** | ✅ Deployed | ❓ Check dashboard | ❓ |

---

## 🎯 Your Action Plan

### **STEP 1: Open Diagnostic Tool** (5 minutes)
```
https://tradeimperial.com/diagnostic-test.html
```
Run all tests and screenshot any RED errors.

### **STEP 2: Open Production Console** (2 minutes)
```
https://tradeimperial.com/dashboard/signal-stream
Press F12 → Console tab
```
Look for the 🚨 ModernNotificationSystem logs.

### **STEP 3: Create Test Signal** (3 minutes)
Use the SQL query above to create a test signal.
Watch console for notification broadcast.

### **STEP 4: Report Findings**
Use this template:

```
## Production Notification Debug Report

**Browser:** Chrome 120 / Safari 17 / Firefox 121
**URL:** https://tradeimperial.com/dashboard/signal-stream
**Date/Time:** 2025-11-15 3:45 PM PST

### Diagnostic Tool Results:
- Environment: ✅ Production
- Supabase: ✅ Connected / ❌ Failed
- Realtime: ✅ Subscribed / ❌ Failed
- Database Trigger: ✅ Works / ❌ Failed

### Console Logs:
[paste key logs here]

### Test Signal:
- Created: Yes / No
- Notification Received: Yes / No
- Popup Appeared: Yes / No
- Recent Activity Updated: Yes / No

### Screenshots:
[attach if possible]
```

---

## 🚀 Likely Resolution

Based on the pattern (works in Lovable, not in production), the issue is **almost certainly**:

1. **Stale production build** (80% chance)
   - Fix: Re-deploy from main branch
   
2. **Browser cache** (15% chance)
   - Fix: Hard refresh + clear cache
   
3. **Environment difference** (5% chance)
   - Fix: Check diagnostic tool for specifics

---

## 📞 Need Help?

**Run the diagnostic tool first:**
```
https://tradeimperial.com/diagnostic-test.html
```

**Then share:**
1. Screenshot of diagnostic results
2. Console logs from F12
3. Test signal creation result

This will give us enough info to pinpoint the exact issue! 🎯

---

**Created:** November 15, 2025  
**Tools:**
- `NOTIFICATION_TROUBLESHOOTING_CHECKLIST.md` (detailed)
- `diagnostic-test.html` (interactive)
- `MACOS_NOTIFICATION_SUMMARY.md` (macOS guide)

