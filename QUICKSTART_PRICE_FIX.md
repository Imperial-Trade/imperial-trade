# Quick Start: Fix Price Ingestor in 5 Minutes

## The Problem

Your price ingestor edge function is not working because **INGEST_SECRET is not configured**. Without this secret, the function cannot authenticate incoming price data and returns an error.

## The Solution (5 Minutes)

### Step 1: Generate Secret (30 seconds)

```bash
bash scripts/generate-ingest-secret.sh
```

This will generate a secure random secret and give you instructions. **Copy the generated secret!**

### Step 2: Configure in Supabase (2 minutes)

1. Go to: https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi
2. Navigate to: **Settings → Edge Functions → Manage Secrets**
3. Add new secret:
   - **Key:** `INGEST_SECRET`
   - **Value:** [paste the secret from Step 1]
4. Click **Save**

### Step 3: Verify Setup (1 minute)

```bash
# Export the secret locally for testing
export INGEST_SECRET='your-secret-from-step-1'

# Run verification
bash scripts/verify-price-ingestor-setup.sh
```

Expected output: `✅ All checks passed! Setup looks good.`

### Step 4: Test with Simulator (2 minutes)

```bash
cd test-scripts
export INGEST_SECRET='your-secret-from-step-1'
node external-price-simulator.mjs --verbose
```

Expected output:
```
✅ Batch sent successfully (123ms)
   Processed: 5
   Upserted: 5
```

### Step 5: Verify Frontend (30 seconds)

1. Open your app in a browser
2. Open DevTools (F12)
3. Check console for:
   ```
   ✅ [OptimizedWebSocket] Received X prices from database
   ```
4. Prices should now be displaying!

## If It Still Doesn't Work

### Check 1: Verify the function is deployed

```bash
# Check in Supabase Dashboard
# Edge Functions → price-ingestor → Should show "Deployed"
```

If not deployed, deploy it:
```bash
supabase functions deploy price-ingestor
```

### Check 2: Verify database has prices

Go to Supabase Dashboard → SQL Editor, run:
```sql
SELECT symbol, mid, timestamp,
       EXTRACT(EPOCH FROM (NOW() - timestamp)) as seconds_old
FROM market_prices
ORDER BY timestamp DESC
LIMIT 5;
```

Expected: Recent prices (< 10 seconds old)

### Check 3: Check edge function logs

Go to: Supabase Dashboard → Edge Functions → price-ingestor → Logs

Look for:
- ✅ `✅ Authentication successful`
- ✅ `💾 STEP 2 COMPLETE: X upserts successful`
- ❌ If you see `❌ INGEST_SECRET not configured` → Go back to Step 2

## Production Setup

For production (real price feed instead of simulator):

1. Configure your price feed service to send to:
   ```
   POST https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/price-ingestor
   Header: X-INGEST-KEY: your-INGEST_SECRET
   ```

2. Use this payload format:
   ```json
   {
     "prices": [
       {
         "symbol": "XAUUSD",
         "bid": 2745.23,
         "ask": 2745.45,
         "price": 2745.34,
         "timestamp": "2025-11-05T12:00:00Z"
       }
     ]
   }
   ```

## Need More Help?

Read the comprehensive guide:
```bash
cat PRICE_INGESTOR_FIX_GUIDE.md
```

## Summary

1. ✅ Generate INGEST_SECRET: `bash scripts/generate-ingest-secret.sh`
2. ✅ Set in Supabase Dashboard: Settings → Edge Functions → Secrets
3. ✅ Test: `cd test-scripts && node external-price-simulator.mjs`
4. ✅ Verify: Check frontend displays prices

**Total Time: 5 minutes** ⏱️

Your price ingestor will be working and your frontend will show live prices! 🚀
