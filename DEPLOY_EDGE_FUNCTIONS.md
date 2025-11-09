# 🚀 Deploy Edge Functions to Supabase

## Prerequisites
✅ Supabase CLI installed (already done via Homebrew)
✅ Changes merged to main branch (already done)

## Step 1: Login to Supabase

Run this command and follow the browser prompt:

```bash
supabase login
```

This will open your browser to authenticate with Supabase.

## Step 2: Deploy Critical Edge Functions

Once logged in, deploy the notification-related Edge Functions:

```bash
cd "/Users/nthny_11/Trade imperial GITHUB /sidebar/imperial-trade"

# Deploy enhanced signal notification dispatcher
supabase functions deploy enhanced-signal-notification-dispatcher --project-ref kmuoqkcxguafxulqlbmi

# Deploy price monitoring
supabase functions deploy price-monitoring --project-ref kmuoqkcxguafxulqlbmi

# Deploy priority alert monitor  
supabase functions deploy priority-alert-monitor --project-ref kmuoqkcxguafxulqlbmi
```

## Step 3: Verify Deployment

Check the Supabase dashboard to see the updated versions:
https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/functions

## Step 4: Apply SQL Trigger Fix (CRITICAL!)

⚠️ **Don't forget this step!** This is the most important fix for duplicate notifications.

1. Open Supabase Dashboard: https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/sql
2. Click **SQL Editor** in left sidebar
3. Open `APPLY_THIS_TO_SUPABASE.sql` from your repository
4. Copy the entire contents
5. Paste into SQL Editor
6. Click **RUN** button
7. Wait for "Success" message

## Step 5: Test

1. Create a new Bitcoin BUY signal
2. ✅ Should see **ONE** modern notification (upper-right)
3. ✅ Should see **ONE** toast (lower-right)
4. Let it hit stop loss
5. ✅ Should see **ONE** "Stop Loss Hit!" notification
6. ✅ Signal should **instantly** move to "Closed Alerts"

---

## Quick Deploy Script (All at Once)

If you want to deploy all three at once:

```bash
cd "/Users/nthny_11/Trade imperial GITHUB /sidebar/imperial-trade"

for func in enhanced-signal-notification-dispatcher price-monitoring priority-alert-monitor; do
  echo "🔄 Deploying $func..."
  supabase functions deploy "$func" --project-ref kmuoqkcxguafxulqlbmi
  echo "✅ Done!"
  echo ""
done

echo "🎉 All Edge Functions deployed!"
echo ""
echo "⚠️  Don't forget to apply APPLY_THIS_TO_SUPABASE.sql in Supabase SQL Editor!"
```

---

## Troubleshooting

### "Access token not provided"
Run `supabase login` first to authenticate

### "failed to parse config"
This is fine - we're deploying directly with `--project-ref`, so local config doesn't matter

### Function deployment fails
- Check internet connection
- Verify you're logged in: `supabase projects list`
- Try re-running the specific function deployment command

---

## What Was Deployed?

These Edge Functions contain the following fixes:

### `enhanced-signal-notification-dispatcher`
- Improved deduplication logic with granular signatures
- Circuit breaker now per-notification-type instead of per-signal
- Better error handling and logging

### `price-monitoring`
- Complete metadata in notification payloads
- All signal fields included (TP1-5, entry, SL, etc.)
- Synchronized with notification dispatcher

### `priority-alert-monitor`
- Uses `enhanced-signal-notification-dispatcher` instead of old one
- Enriched payload with author details
- Standardized notification types

---

**Once deployed, your notification system should work perfectly with no duplicates!** 🎉

