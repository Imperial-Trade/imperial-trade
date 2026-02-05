# 🚨 CRITICAL DATABASE TRIGGER FIX NEEDED

## Problem
The database trigger `instant_notification_router()` is **crashing** because it's trying to query `onesignal_player_id` and `onesignal_subscription_status` columns that **no longer exist** after migrating to Pusher Beams.

## Error in Postgres Logs
```
❌ [TRIGGER ERROR] Signal: c0501903-82ce-44e0-a890-bf0591643944, Error: column "onesignal_player_id" does not exist
```

## Impact
- ❌ No notifications are being sent (modern notification modal, recent activity, or push notifications)
- ❌ The trigger fires but crashes before calling Edge Functions
- ❌ All signal creation, TP hits, SL hits, and manual closes are not generating notifications

## Solution
The migration file `supabase/migrations/20251118_fix_pusher_beams_trigger.sql` has been created with the fixed trigger function.

## How to Apply (MANUAL STEPS REQUIRED)

Since `supabase db push` is having migration versioning issues, you need to apply the fix **manually**:

### Option 1: Via Supabase Dashboard
1. Go to https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/editor
2. Click "SQL Editor"
3. Open the file `supabase/migrations/20251118_fix_pusher_beams_trigger.sql`
4. Copy the entire contents
5. Paste into the SQL Editor
6. Click "Run"

### Option 2: Via PowerShell
```powershell
cd "C:\Users\Jacob Estayo\Trade imperial\imperial-trade"
$sql = Get-Content -Path "supabase/migrations/20251118_fix_pusher_beams_trigger.sql" -Raw
$env:PGPASSWORD="Lagrimas030503."
psql -h "aws-0-us-west-1.pooler.supabase.com" -p 5432 -d "postgres" -U "postgres.kmuoqkcxguafxulqlbmi" -c "$sql"
```

## What the Fix Does
- ✅ Removes `onesignal_player_id` reference from the `v_push_users` query
- ✅ Removes `onesignal_subscription_status = 'subscribed'` condition
- ✅ Uses only `push_subscription_active = true` for Pusher Beams compatibility
- ✅ Keeps all other notification logic intact (TP hits, SL hits, manual close, etc.)

## After Applying
Test by creating a new signal on https://tradeimperial.com and you should see:
1. ✅ Modern notification pop-up modal
2. ✅ Entry in Recent Activity
3. ✅ Push notification in your Windows Notification Center (if subscribed to `trade_alerts`)

---

**NEXT STEP**: Please apply the fix using one of the options above, then create a test signal to verify it works! 🚀

