# 🚀 Edge Functions Deployment Checklist

## ✅ Critical Notification Edge Functions

These Edge Functions are called by the database trigger `instant_notification_router` and MUST be deployed for notifications to work.

### 📋 Notification Edge Functions Status

| Function Name | Purpose | Status | Called By |
|--------------|---------|--------|-----------|
| `notify-signal-created` | New BUY/SELL signals | ✅ EXISTS | Database trigger |
| `notify-limit-activated` | Limit order activated | ✅ EXISTS | Database trigger |
| `notify-tp-hit` | Any TP hit (TP1-TP5) | ✅ EXISTS | Database trigger |
| `notify-tp1-hit` | TP1 specific | ✅ EXISTS | Database trigger |
| `notify-tp2-hit` | TP2 specific | ✅ EXISTS | Database trigger |
| `notify-tp3-hit` | TP3 specific | ✅ EXISTS | Database trigger |
| `notify-tp4-hit` | TP4 specific | ✅ EXISTS | Database trigger |
| `notify-tp5-hit` | TP5 specific | ✅ EXISTS | Database trigger |
| `notify-stop-loss-hit` | Stop loss hit | ✅ EXISTS | Database trigger |
| `notify-signal-closed` | Manual close / all TPs | ✅ EXISTS | Database trigger |
| `notify-notes-updated` | Notes changed | ✅ EXISTS | Database trigger |

### 📋 Supporting Edge Functions

| Function Name | Purpose | Status | Called By |
|--------------|---------|--------|-----------|
| `send-welcome-notification` | Welcome push notification | ✅ EXISTS | Frontend (after subscribe) |
| `onesignal-webhook` | OneSignal webhook handler | ✅ EXISTS | OneSignal service |

---

## 🔧 How Notifications Flow

### 1. Database Trigger → Edge Function → Realtime Broadcast

```
User creates/updates signal
    ↓
Database trigger: instant_notification_router
    ↓
Calls appropriate Edge Function (e.g., notify-tp-hit)
    ↓
Edge Function broadcasts to Realtime channel: instant-alerts
    ↓
Frontend receives broadcast → Shows notification
```

### 2. Edge Functions Use Shared Code

All notification Edge Functions use:
- **`_shared/notification-core.ts`**: Notification templates and delivery logic
- **`_shared/cors.ts`**: CORS headers
- **`_shared/notify.ts`**: Helper functions

---

## 🚨 Deployment Commands

### Deploy ALL Notification Edge Functions

```bash
# Deploy all notification functions at once
supabase functions deploy notify-signal-created
supabase functions deploy notify-limit-activated
supabase functions deploy notify-tp-hit
supabase functions deploy notify-tp1-hit
supabase functions deploy notify-tp2-hit
supabase functions deploy notify-tp3-hit
supabase functions deploy notify-tp4-hit
supabase functions deploy notify-tp5-hit
supabase functions deploy notify-stop-loss-hit
supabase functions deploy notify-signal-closed
supabase functions deploy notify-notes-updated
supabase functions deploy send-welcome-notification
supabase functions deploy onesignal-webhook
```

### Deploy Individual Function

```bash
supabase functions deploy notify-tp-hit
```

### Deploy with Environment Variables

```bash
supabase functions deploy notify-tp-hit --project-ref eswofqcdjpjstkhglkkn
```

---

## 🔍 Verify Deployment

### Method 1: Check Supabase Dashboard

1. Go to Supabase Dashboard → Edge Functions
2. Verify all 11 notification functions are listed
3. Check "Last deployed" timestamp
4. Verify "Status" is "Deployed"

### Method 2: Test Edge Function Directly

```bash
# Test notify-tp-hit
curl -X POST https://eswofqcdjpjstkhglkkn.supabase.co/functions/v1/notify-tp-hit \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "signal": {
      "id": "test-123",
      "asset_name": "Gold",
      "entry_price": 2650,
      "author_name": "Test Educator",
      "trade_type": "buy"
    },
    "tp_number": 1,
    "triggered_price": 2680,
    "pips": 30,
    "users": []
  }'
```

Expected response:
```json
{
  "success": true,
  "template_used": "tp_hit",
  "tp_number": 1,
  "realtime": {...},
  "push": {...},
  "timestamp": "2025-11-17T..."
}
```

### Method 3: Check Edge Function Logs

1. Supabase Dashboard → Edge Functions → Select function
2. Click "Logs" tab
3. Look for recent invocations
4. Verify no errors

---

## 🔍 Database Trigger Verification

### Check if Trigger Exists

```sql
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'instant_notification_router_trigger';
```

Expected result:
- `trigger_name`: `instant_notification_router_trigger`
- `event_manipulation`: `UPDATE` or `INSERT`
- `event_object_table`: `trade_alerts`
- `action_statement`: Should reference `instant_notification_router()` function

### Check Trigger Function Code

```sql
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'instant_notification_router';
```

Should return:
- Function that calls `net.http_post()` to invoke Edge Functions
- Conditional logic for different notification types (TP1, TP2, etc.)

---

## ⚠️ Common Deployment Issues

### Issue 1: Edge Function Returns 404

**Cause**: Function not deployed or wrong project ref

**Fix**:
```bash
supabase functions deploy notify-tp-hit --project-ref eswofqcdjpjstkhglkkn
```

### Issue 2: CORS Errors

**Cause**: Missing CORS headers in Edge Function

**Fix**: Verify `_shared/cors.ts` is included and headers are set

### Issue 3: Function Times Out

**Cause**: Supabase Realtime taking too long to subscribe

**Fix**: Already handled in `notification-core.ts` with 5-second timeout

### Issue 4: Trigger Not Firing

**Cause**: Trigger disabled or RLS blocking

**Fix**: 
```sql
-- Check if trigger is enabled
SELECT tgenabled FROM pg_trigger WHERE tgname = 'instant_notification_router_trigger';
-- 'O' = enabled, 'D' = disabled

-- Enable if disabled
ALTER TABLE trade_alerts ENABLE TRIGGER instant_notification_router_trigger;
```

---

## 🧪 End-to-End Testing

### Test 1: Create New Signal
1. Create new signal via dashboard
2. Check Edge Function logs: `notify-signal-created` should be invoked
3. Check frontend console: Should receive Realtime broadcast
4. Verify modern notification modal appears

### Test 2: Trigger TP1
```sql
UPDATE trade_alerts 
SET tp_hits = ARRAY[1], updated_at = NOW()
WHERE id = 'YOUR_SIGNAL_ID';
```
1. Check Edge Function logs: `notify-tp-hit` should be invoked
2. Check frontend console: Should receive Realtime broadcast
3. Verify notification shows in Recent Activity

### Test 3: Manual Close
1. Click "Close My Signal" on active alert
2. Check Edge Function logs: `notify-signal-closed` should be invoked
3. Verify notification appears

---

## 📊 Edge Function Dependencies

### Shared Code (_shared/)

All notification Edge Functions depend on:

**`_shared/notification-core.ts`** (CRITICAL):
- `NOTIFICATION_TEMPLATES`: 9 notification templates
- `sendRealtimeNotification()`: Broadcasts to `instant-alerts` channel
- `sendPushNotification()`: Sends OneSignal push notifications

**Status**: ✅ EXISTS

**Must be deployed WITH Edge Functions** (automatically included)

---

## ✅ Deployment Checklist for User

Before testing, ensure:

- [ ] All 11 notification Edge Functions are deployed
- [ ] `_shared/notification-core.ts` is up to date
- [ ] Database trigger `instant_notification_router` exists
- [ ] Supabase Realtime is enabled for `trade_alerts` table
- [ ] OneSignal App ID and API key are set in Supabase secrets
- [ ] Frontend is using latest code (v1.0.16)

---

## 🚀 Quick Deploy All Script

```bash
#!/bin/bash
# deploy-notifications.sh

echo "🚀 Deploying all notification Edge Functions..."

# Array of all notification functions
functions=(
  "notify-signal-created"
  "notify-limit-activated"
  "notify-tp-hit"
  "notify-tp1-hit"
  "notify-tp2-hit"
  "notify-tp3-hit"
  "notify-tp4-hit"
  "notify-tp5-hit"
  "notify-stop-loss-hit"
  "notify-signal-closed"
  "notify-notes-updated"
  "send-welcome-notification"
  "onesignal-webhook"
)

# Deploy each function
for func in "${functions[@]}"; do
  echo "📦 Deploying $func..."
  supabase functions deploy $func --project-ref eswofqcdjpjstkhglkkn
  
  if [ $? -eq 0 ]; then
    echo "✅ $func deployed successfully"
  else
    echo "❌ Failed to deploy $func"
  fi
done

echo "🎉 All Edge Functions deployed!"
```

Usage:
```bash
chmod +x deploy-notifications.sh
./deploy-notifications.sh
```

---

## 📝 Summary

**Total Notification Edge Functions**: 11
**Total Supporting Functions**: 2
**Total**: 13 Edge Functions

**All Edge Functions exist in codebase** ✅

**Next Step**: User must deploy to Supabase using `supabase functions deploy` commands above.

---

## 💡 Recommendation

Since you have access to Supabase, run this single command to deploy ALL notification functions:

```bash
cd imperial-trade && \
supabase functions deploy notify-signal-created && \
supabase functions deploy notify-limit-activated && \
supabase functions deploy notify-tp-hit && \
supabase functions deploy notify-tp1-hit && \
supabase functions deploy notify-tp2-hit && \
supabase functions deploy notify-tp3-hit && \
supabase functions deploy notify-tp4-hit && \
supabase functions deploy notify-tp5-hit && \
supabase functions deploy notify-stop-loss-hit && \
supabase functions deploy notify-signal-closed && \
supabase functions deploy notify-notes-updated && \
supabase functions deploy send-welcome-notification && \
supabase functions deploy onesignal-webhook
```

This will ensure ALL notification Edge Functions are deployed and up to date! 🚀

