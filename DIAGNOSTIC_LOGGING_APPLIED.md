# ✅ DIAGNOSTIC LOGGING APPLIED

**Date**: January 16, 2025  
**Status**: DIAGNOSTIC LOGGING ACTIVE ✅

---

## 🎯 WHAT WAS DONE

I've successfully applied diagnostic logging to the `instant_notification_router()` database trigger function. The function will now log:

1. **📤 HTTP POST Attempt**: Before making the request
   - Signal ID (first 8 chars)
   - Notification type
   - Full Edge Function URL
   - Payload size in bytes

2. **📥 HTTP Response**: After receiving response
   - HTTP status code (200, 401, 404, 500, etc.)
   - Response body (first 200 characters)

3. **✅ Success or ❌ Error**: Based on status code
   - 2xx: Success message
   - 4xx/5xx: Warning with full error details

4. **❌ Exceptions**: If any errors occur
   - Exception message
   - SQL state code

---

## 📊 HOW TO VIEW THE LOGS

### Option 1: Supabase Dashboard (Easiest)
1. Go to: https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/logs/postgres-logs
2. Look for messages starting with:
   - `📤 [HTTP POST]`
   - `📥 [HTTP RESPONSE]`
   - `✅ [Edge Function Success]`
   - `❌ [Edge Function Failed]`

### Option 2: Via SQL Query
```sql
SELECT 
  timestamp,
  error_severity,
  event_message
FROM postgres_logs
WHERE event_message LIKE '%HTTP%'
  OR event_message LIKE '%Edge Function%'
ORDER BY timestamp DESC
LIMIT 20;
```

---

## 🧪 TESTING INSTRUCTIONS

### Test 1: Create a New Signal
1. Go to your app and create a new signal (BUY or SELL)
2. Check Postgres logs for:
   ```
   📤 [HTTP POST] Signal: abc123..., Type: signal_created, URL: .../notify-signal-created, Payload size: 542 bytes
   📥 [HTTP RESPONSE] Status: 200, Body: {"success":true}
   ✅ [Edge Function Success] Signal: abc123..., Status: 200
   ```

### Test 2: Wait for TP Hit
1. Wait for price to hit a take profit level
2. Check Postgres logs for:
   ```
   📤 [HTTP POST] Signal: xyz789..., Type: tp_hit, URL: .../notify-tp1-hit, Payload size: 587 bytes
   📥 [HTTP RESPONSE] Status: ???, Body: ???
   ```

### Test 3: Check for Errors
If you see **401 Unauthorized**:
```
📥 [HTTP RESPONSE] Status: 401, Body: {"error":"Unauthorized"}
❌ [Edge Function Failed] Signal: xyz789..., Status: 401, Body: {"error":"Unauthorized"}
```
→ **Root Cause**: `service_role_key` in trigger is invalid

If you see **404 Not Found**:
```
📥 [HTTP RESPONSE] Status: 404, Body: {"error":"Not Found"}
❌ [Edge Function Failed] Signal: xyz789..., Status: 404, Body: {"error":"Not Found"}
```
→ **Root Cause**: Edge Function URL is incorrect or function doesn't exist

If you see **500 Internal Server Error**:
```
📥 [HTTP RESPONSE] Status: 500, Body: {"error":"Internal Server Error"}
❌ [Edge Function Failed] Signal: xyz789..., Status: 500, Body: ...
```
→ **Root Cause**: Edge Function is crashing or has a bug

If you see **Timeout or no response**:
```
❌ [Instant Notification] Exception for signal xyz789...: timeout (SQLSTATE: ...)
```
→ **Root Cause**: Edge Function is taking > 5 seconds or network issue

---

## 🎯 EXPECTED RESULTS

### If Everything is Working (Success Case)
```
NOTICE: 📤 [HTTP POST] Signal: ff2426f6, Type: tp_hit, URL: https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/notify-tp1-hit, Payload size: 587 bytes
NOTICE: 📥 [HTTP RESPONSE] Status: 200, Body: {"success":true,"template_used":"tp_hit","realtime":{"success":true},"push":{"success":true},"timestamp":"2025-01-16T21:30:00.000Z"}
NOTICE: ✅ [Edge Function Success] Signal: ff2426f6, Status: 200
```

### If Edge Functions Are Not Reached (Current Issue)
```
NOTICE: 📤 [HTTP POST] Signal: ff2426f6, Type: tp_hit, URL: https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/notify-tp1-hit, Payload size: 587 bytes
WARNING: ❌ [Edge Function Failed] Signal: ff2426f6, Status: 401, Body: {"error":"Invalid JWT"}
```
OR
```
NOTICE: 📤 [HTTP POST] Signal: ff2426f6, Type: tp_hit, URL: https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/notify-tp1-hit, Payload size: 587 bytes
WARNING: ❌ [Instant Notification] Exception for signal ff2426f6: connection timeout (SQLSTATE: XX000)
```

---

## 📞 NEXT STEPS BASED ON LOGS

### If Status: 200 (Success)
✅ **Edge Functions ARE being reached!**
- Problem is likely in the Edge Function code itself
- Check Edge Function logs for errors
- Verify Realtime broadcast is being sent

### If Status: 401 (Unauthorized)
❌ **Authentication failure**
- `service_role_key` in trigger is invalid or expired
- **FIX**: Update the trigger with correct `service_role_key`

### If Status: 404 (Not Found)
❌ **Edge Function URL is wrong**
- Edge Function doesn't exist at that URL
- **FIX**: Verify Edge Function slug and `base_url`

### If Status: 500 (Internal Server Error)
❌ **Edge Function is crashing**
- Edge Function has a bug or missing dependency
- **FIX**: Check Edge Function logs for error details

### If Timeout/No Response
❌ **Network or timeout issue**
- Edge Function taking > 5 seconds
- Network connectivity problem
- **FIX**: Increase timeout or check Edge Function performance

---

## 🚀 READY TO TEST

The diagnostic logging is now **ACTIVE**. 

**To trigger it:**
1. Create a new signal in your app, OR
2. Wait for an existing signal to hit a TP/SL

**Then check:**
- Supabase Dashboard → Logs → Postgres Logs
- Look for `📤`, `📥`, `✅`, or `❌` messages

**Once you see the logs, we'll know EXACTLY why the Edge Functions aren't working!**

---

## 📝 SUMMARY

✅ **Diagnostic logging applied to `instant_notification_router()` function**  
✅ **Function will log HTTP requests and responses**  
✅ **Logs will show exact status codes and error messages**  
✅ **Ready to diagnose the root cause**

**Next**: Create a signal or wait for TP/SL hit, then check Postgres logs!

