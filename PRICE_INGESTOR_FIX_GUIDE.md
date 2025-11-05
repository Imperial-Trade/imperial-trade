# Price Ingestor Edge Function Fix Guide

## Problem Diagnosis ✅

The price ingestor edge function is not processing prices, causing the frontend to display no data. This is because:

1. **Missing INGEST_SECRET** - The edge function requires this environment variable
2. **No price feed** - No external service is sending price data to the function
3. **Frontend polling** - The frontend polls the database every 500ms, but finds no prices

## Architecture Overview

```
External Price Feed (TraderMade/DigitalOcean/Simulator)
    ↓ (sends prices via HTTPS POST with X-INGEST-KEY header)
Supabase Edge Function: price-ingestor
    ↓ (processes & stores in database)
Database Table: market_prices
    ↓ (polled every 500ms)
Frontend: OptimizedWebSocketPriceContext
    ↓
User sees live prices
```

## Fix Steps

### Step 1: Generate and Configure INGEST_SECRET

1. **Generate a secure secret:**
```bash
# Generate a random 32-character secret
openssl rand -hex 32
```

2. **Set the secret in Supabase:**
   - Go to your Supabase Dashboard: https://supabase.com/dashboard
   - Navigate to your project: **kmuoqkcxguafxulqlbmi**
   - Go to **Settings** → **Edge Functions** → **Manage Secrets**
   - Add a new secret:
     - Key: `INGEST_SECRET`
     - Value: [paste the generated secret from step 1]
   - Click **Save**

3. **Verify the function is deployed:**
   - Go to **Edge Functions** in the dashboard
   - Verify `price-ingestor` is listed and shows as "Deployed"
   - If not deployed, deploy it:
     ```bash
     # Install Supabase CLI if needed
     npm install -g supabase

     # Login
     supabase login

     # Link to your project
     supabase link --project-ref kmuoqkcxguafxulqlbmi

     # Deploy the function
     supabase functions deploy price-ingestor
     ```

### Step 2: Set Up Price Feed

You have two options:

#### Option A: Use the Test Simulator (Quick Test)

This is perfect for testing and development:

```bash
# Navigate to test scripts
cd test-scripts

# Set your INGEST_SECRET (use the one you generated)
export INGEST_SECRET="your-secret-here"

# Run the simulator
node external-price-simulator.mjs --verbose
```

The simulator will send realistic price updates for 30 seconds.

#### Option B: Set Up Production Price Feed

For production, you need a real price data provider:

1. **TraderMade API** (recommended):
   - Sign up at https://tradermade.com
   - Get your API key
   - Configure it to POST prices to:
     ```
     https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/price-ingestor
     ```
   - Include header: `X-INGEST-KEY: [your-INGEST_SECRET]`

2. **DigitalOcean Droplet** (existing setup):
   - If you have a DigitalOcean droplet running a price feed service
   - Update its configuration to use the new INGEST_SECRET
   - Ensure it's sending to the correct endpoint

3. **Expected Payload Format:**
```json
{
  "prices": [
    {
      "symbol": "XAUUSD",
      "bid": 2745.23,
      "ask": 2745.45,
      "price": 2745.34,
      "timestamp": "2025-11-05T12:00:00Z"
    },
    {
      "symbol": "EURUSD",
      "bid": 1.0850,
      "ask": 1.0852,
      "price": 1.0851,
      "timestamp": "2025-11-05T12:00:00Z"
    }
  ]
}
```

### Step 3: Verify the Fix

1. **Check edge function logs:**
   - Go to Supabase Dashboard → **Edge Functions** → **price-ingestor** → **Logs**
   - Look for these success indicators:
     ```
     ✅ Authentication successful
     📊 Processing X price updates
     💾 STEP 2 COMPLETE: X upserts successful
     ✅ DATABASE HEALTH: All X price upserts successful
     ```

   - If you see errors like:
     ```
     ❌ INGEST_SECRET not configured
     ❌ Invalid or missing X-INGEST-KEY header
     ```
     Go back to Step 1 and verify the secret is set correctly.

2. **Check database has prices:**
```sql
-- Run in Supabase SQL Editor
SELECT
  symbol,
  bid,
  ask,
  mid,
  timestamp,
  EXTRACT(EPOCH FROM (NOW() - timestamp)) as seconds_old
FROM market_prices
ORDER BY timestamp DESC
LIMIT 10;
```

Expected result: Recent prices (< 10 seconds old) for XAUUSD, EURUSD, etc.

3. **Check frontend displays prices:**
   - Open your application in a browser
   - Open DevTools Console (F12)
   - Look for these logs:
     ```
     📊 [OptimizedWebSocket] Polling database for prices...
     ✅ [OptimizedWebSocket] Received X prices from database
     ```
   - The frontend should display live prices

### Step 4: Health Check

Use the built-in health check utility:

```typescript
// In browser console or React component
import { checkPriceIngestorHealth } from '@/utils/priceIngestorHealthCheck';

const health = await checkPriceIngestorHealth();
console.log(health);

// Expected output for healthy system:
{
  isHealthy: true,
  severity: 'normal',
  lastUpdateAge: 2.5, // seconds
  message: 'Price feed is healthy',
  recommendations: []
}

// Output if feed is down:
{
  isHealthy: false,
  severity: 'critical',
  lastUpdateAge: 320, // seconds
  message: 'Price feed appears to be down',
  recommendations: ['Check DigitalOcean service immediately', ...]
}
```

## Troubleshooting

### Issue: "INGEST_SECRET not configured" in logs

**Solution:**
- Verify the secret is set in Supabase Dashboard
- Redeploy the edge function: `supabase functions deploy price-ingestor`
- Wait 30 seconds for the function to reload

### Issue: "Invalid or missing X-INGEST-KEY header"

**Solution:**
- Verify your price feed is sending the correct header: `X-INGEST-KEY`
- Verify the header value matches your `INGEST_SECRET`
- Check for trailing spaces or special characters

### Issue: Frontend shows "Disconnected" or "No Data"

**Solution:**
1. Check database has recent prices (Step 3.2)
2. Check browser console for errors
3. Verify the frontend is polling: Look for `[OptimizedWebSocket] Polling database` logs
4. Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)

### Issue: Prices are stale (> 10 seconds old)

**Solution:**
- Check if your price feed service is running
- Check edge function logs for recent activity
- Restart your price feed service
- If using simulator, run it again

### Issue: Function returns 401 Unauthorized

**Solution:**
- The INGEST_SECRET doesn't match
- Regenerate the secret (Step 1)
- Update both Supabase and your price feed with the new secret

## Testing After Fix

### Quick Test (2 minutes)

```bash
# Terminal 1: Run the price simulator
cd test-scripts
export INGEST_SECRET="your-secret-here"
node external-price-simulator.mjs --verbose

# Expected output:
# ✅ Batch sent successfully (123ms)
#    Processed: 5
#    Upserted: 5
```

### Comprehensive Test (5 minutes)

1. Open your app in browser
2. Open DevTools Console (F12)
3. Navigate to a page that shows prices (Signal Stream, Dashboard)
4. Run the simulator (above)
5. Watch the console for:
   - Database polling logs every 500ms
   - Price updates being received
   - UI updating with new prices
6. Verify prices are displayed and updating in real-time

## Production Checklist

Before going live with production price feed:

- [ ] INGEST_SECRET is set in Supabase (Step 1)
- [ ] price-ingestor function is deployed and active
- [ ] Production price feed is configured with correct:
  - [ ] Endpoint URL: `https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/price-ingestor`
  - [ ] Header: `X-INGEST-KEY: [your-INGEST_SECRET]`
  - [ ] Payload format matches expected format (Step 2, Option B)
- [ ] Database receives prices (verified with SQL query)
- [ ] Frontend displays prices (verified in browser)
- [ ] Edge function logs show no errors
- [ ] Health check returns "healthy" status

## Cost Optimization Notes

The current architecture uses **database polling** instead of Supabase Realtime to reduce costs:

- **Frontend polls every 500ms** for price updates
- **No Realtime broadcasts** (saves $32.50/month)
- **Total cost reduction: 70%** ($26-29/month savings)

This is by design and working as intended. The system is NOT broken - it's optimized for cost efficiency.

## Support

If you continue to have issues:

1. Check the edge function logs in Supabase Dashboard
2. Run the test simulator with `--verbose` flag
3. Check browser console for errors
4. Verify all environment variables are set correctly
5. Review this guide again from Step 1

## Summary

The price ingestor is now configured and ready. Remember:

1. **INGEST_SECRET must be set** in Supabase Edge Functions secrets
2. **Price feed must be running** and sending data to the function
3. **Frontend polls database** every 500ms (not Realtime)
4. **Test with simulator** before setting up production feed

Your frontend will display live prices once the price ingestor receives data! 🚀
