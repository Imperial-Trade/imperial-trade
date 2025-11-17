# ✅ OneSignal Webhook Setup - COMPLETE

## 🎉 Implementation Summary

All components have been successfully deployed and configured!

---

## 📦 What Was Deployed

### 1. Database Table ✅
**Table:** `onesignal_webhook_events`
- **Status:** Deployed and active in Supabase
- **Purpose:** Stores notification analytics (displayed, clicked, dismissed events)
- **RLS:** Enabled with proper policies for admins and users

### 2. Edge Function ✅
**Function:** `onesignal-webhook`
- **Status:** Deployed (version 1)
- **Endpoint:** `https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/onesignal-webhook`
- **Purpose:** Receives OneSignal webhook events and stores them in the database

### 3. Frontend Configuration ✅
**File:** `index.html`
- **Updated:** Safari Web ID corrected
- **Old:** `web.onesignal.auto.18b6e18e-7804-46d0-9cf7-7a5dce161e98`
- **New:** `web.onesignal.auto.c6d5466e-9ca7-40b2-90db-57ec42d385ef`
- **Result:** macOS/iOS Safari push notifications now properly configured

---

## 🔧 Next Steps: OneSignal Dashboard Configuration

You now need to configure the webhook URLs in your OneSignal dashboard:

### Step 1: Access OneSignal Settings
1. Go to: [OneSignal Dashboard](https://dashboard.onesignal.com)
2. Select: **"Signal Stream notification"** app
3. Navigate to: **Settings** → **Webhooks** (in the left sidebar under "Advanced Push Settings")

### Step 2: Configure Webhook URLs
In the OneSignal dashboard, you should see three webhook URL fields. Fill them ALL with the same URL:

```
https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/onesignal-webhook
```

**Specific fields:**
- **Notification Displayed:** `https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/onesignal-webhook`
- **Notification Clicked:** `https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/onesignal-webhook`
- **Notification Dismissed:** `https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/onesignal-webhook`

### Step 3: Enable CORS (Already Done)
- **Enable CORS request headers:** Should already be ON
- This allows OneSignal to send requests to your Supabase Edge Function

### Step 4: Save Settings
- Click: **Save** at the bottom of the page
- OneSignal will start sending webhook events to your endpoint

---

## 🧪 Testing the Webhook

### Test 1: Manual cURL Test
You can test the webhook endpoint directly:

```bash
curl -X POST https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/onesignal-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "notification.displayed",
    "id": "test-notification-123",
    "app_id": "c6d5466e-9ca7-40b2-90db-57ec42d385ef",
    "player_ids": ["test-player-id"],
    "headings": {"en": "Test Notification"},
    "contents": {"en": "This is a test webhook event"}
  }'
```

**Expected Response:**
```json
{"success": true, "processed": 1}
```

### Test 2: Live Notification Test
1. **Create a test trading signal** in your app
2. **Check OneSignal Dashboard:**
   - Go to: **Delivery** → **Messages**
   - Verify the notification was sent
3. **Check Supabase Database:**
   - Open: **Supabase Dashboard** → **Table Editor**
   - Select: `onesignal_webhook_events` table
   - You should see entries for:
     - `notification.displayed` (when notification shows)
     - `notification.clicked` (when user clicks)
     - `notification.dismissed` (when user dismisses)

### Test 3: Edge Function Logs
Monitor the Edge Function in real-time:
1. Go to: **Supabase Dashboard** → **Edge Functions**
2. Select: `onesignal-webhook`
3. Click: **Logs**
4. Send a test notification
5. Look for:
   - `📥 [OneSignal Webhook] Received event:`
   - `✅ [OneSignal Webhook] Events stored:`

---

## 📊 Analytics Queries

Once webhooks are configured and events start flowing, you can query analytics:

### Total Events by Type
```sql
SELECT 
  event_type,
  COUNT(*) as total_events
FROM onesignal_webhook_events
GROUP BY event_type
ORDER BY total_events DESC;
```

### Click-Through Rate
```sql
WITH stats AS (
  SELECT
    COUNT(*) FILTER (WHERE event_type = 'notification.displayed') as displayed,
    COUNT(*) FILTER (WHERE event_type = 'notification.clicked') as clicked
  FROM onesignal_webhook_events
  WHERE created_at >= NOW() - INTERVAL '7 days'
)
SELECT
  displayed,
  clicked,
  ROUND((clicked::numeric / NULLIF(displayed, 0)) * 100, 2) as click_through_rate_percent
FROM stats;
```

### User Engagement
```sql
SELECT
  p.display_name,
  p.email,
  COUNT(*) FILTER (WHERE event_type = 'notification.displayed') as notifications_seen,
  COUNT(*) FILTER (WHERE event_type = 'notification.clicked') as notifications_clicked
FROM onesignal_webhook_events w
JOIN profiles p ON p.id = w.user_id
WHERE w.created_at >= NOW() - INTERVAL '30 days'
GROUP BY p.id, p.display_name, p.email
ORDER BY notifications_clicked DESC
LIMIT 20;
```

---

## 🔐 Security Notes

- **JWT Verification:** Edge Function has JWT verification enabled (secure by default)
- **RLS Policies:** Only admins/educators can view all events, users see only their own
- **CORS Headers:** Properly configured to accept requests from OneSignal
- **Service Role Key:** Used for database writes (bypasses RLS for webhook processing)

---

## 📝 Files Modified/Created

### New Files
- ✅ `supabase/migrations/20251117000000_create_onesignal_webhook_events.sql`
- ✅ `supabase/functions/onesignal-webhook/index.ts`

### Modified Files
- ✅ `index.html` (Safari Web ID updated)

### Git Commit
- **Commit Hash:** `a569e284`
- **Message:** `feat: add OneSignal webhook endpoint and update Safari Web ID configuration`
- **Branch:** `main`
- **Status:** Pushed to GitHub ✅

---

## 🚀 Production Readiness

### ✅ Deployed Components
- [x] Database table created
- [x] Edge Function deployed
- [x] Frontend Safari Web ID updated
- [x] Code committed and pushed to GitHub

### ⏳ Pending User Action
- [ ] Configure webhook URLs in OneSignal dashboard
- [ ] Turn OFF "Customize service worker paths" in OneSignal settings
- [ ] Click "Save" in OneSignal dashboard
- [ ] Test with a live notification

---

## 🆘 Troubleshooting

### Issue: Webhooks not receiving events
**Solution:**
1. Verify webhook URLs are correctly entered in OneSignal dashboard
2. Check that CORS is enabled in OneSignal
3. Review Edge Function logs for errors

### Issue: Events not stored in database
**Solution:**
1. Check Edge Function logs: `Supabase Dashboard → Edge Functions → onesignal-webhook → Logs`
2. Verify `onesignal_webhook_events` table exists
3. Check RLS policies are not blocking inserts

### Issue: Can't find user_id for webhook events
**Solution:**
- This is expected if the user's `onesignal_player_id` is not stored in the `profiles` table
- The webhook will still store the event with `user_id = NULL`
- Ensure users are properly subscribing to push notifications on login

---

## 📞 Support

If you encounter any issues:
1. Check Edge Function logs in Supabase Dashboard
2. Review OneSignal webhook delivery logs
3. Verify database table structure matches migration
4. Check browser console for OneSignal initialization errors

---

**Status:** ✅ Ready for final OneSignal dashboard configuration!

**Webhook URL:** `https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/onesignal-webhook`

Copy this URL and paste it into all three webhook fields in OneSignal dashboard, then click Save!

