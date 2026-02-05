# Step 3: Verify Edge Function Deployment

## ✅ Current Status

- ✅ Edge Function `mt5-sync` already deployed
- ✅ Secret `INGEST_SECRET` configured
- ✅ All tests passed (6/6)
- ⏳ Verify it's still running

## 📋 Verification Steps

### 1. Check Edge Function Status

```bash
# From your local machine
curl -X OPTIONS https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/mt5-sync \
  -H "x-ingest-key: Imperial_Secret_2026"
```

**Expected:** `ok` (200 OK)

### 2. Test with Empty Trades

```bash
curl -X POST https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/mt5-sync \
  -H "Content-Type: application/json" \
  -H "x-ingest-key: Imperial_Secret_2026" \
  -d '{"account":"123456","trades":[]}'
```

**Expected:** `{"success":true,"trades_synced":0}`

### 3. Check Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/functions
2. Find `mt5-sync` function
3. Check status: Should be "Active"
4. Check logs: Should show recent requests

## ✅ If Function is Missing

If the function is not deployed:

```bash
cd "/Users/nthny_11/Trade imperial GITHUB /nov 7 notif project/imperial-trade"
supabase functions deploy mt5-sync --project-ref kmuoqkcxguafxulqlbmi
supabase secrets set INGEST_SECRET=Imperial_Secret_2026 --project-ref kmuoqkcxguafxulqlbmi
```

## 📝 Notes

- The Edge Function receives trade data from MQL5 EA
- Authentication: `x-ingest-key: Imperial_Secret_2026`
- Endpoint: `/functions/v1/mt5-sync`
- Function upserts trades to `trade_journal_entries`
- Updates `broker_connections.last_sync_at`
