# Live Price Display Fix - Create Alerts Issue

## Problem Summary

Live prices were not displaying in the Create Alerts modal. This document explains the root causes and the fixes applied.

## Root Causes

### 1. **CRITICAL: Polling Interval Too Slow on Create Alerts Page**

**File:** `src/contexts/OptimizedWebSocketPriceContext.tsx:997-1022`

The Create Alerts page (`/dashboard/new-signal`) was using a **30-second polling interval** instead of 500ms:

**Original Code:**
```typescript
const isSignalStreamPage = window.location.pathname.includes('/signal-stream');

const pollingInterval = isSignalStreamPage
  ? 500  // Fast polling for signal stream
  : 30000; // Slow polling for other pages (including Create Alerts!)
```

**Impact:** When users opened Create Alerts, prices updated only every 30 seconds, making the live price display appear frozen or stuck on "Loading..."

**Fix Applied:**
```typescript
const isSignalStreamPage = window.location.pathname.includes('/signal-stream');
const isNewSignalPage = window.location.pathname.includes('/new-signal'); // NEW

const pollingInterval = (isSignalStreamPage || isNewSignalPage)
  ? 500  // ✅ Fast polling for both signal stream AND create alerts
  : hasActiveSubscriptions
  ? 2000 // Moderate polling for other pages with subscriptions
  : 30000; // Minimal polling for background
```

### 2. Architecture Change: No Realtime Broadcasts
**File:** `supabase/functions/price-ingestor/index.ts:858`

The price ingestor was redesigned to use **database polling** instead of Supabase Realtime broadcasts:

```typescript
// ✅ PHASE 1: ZERO-REALTIME ARCHITECTURE
// Broadcasts removed - frontend uses database polling (500ms)
console.log(`💾 Database upserts complete. Frontend will poll for updates (no broadcasts).`);
```

**Impact:** This is working as designed. The edge function:
- ✅ Accepts price updates via POST with `X-INGEST-KEY` header
- ✅ Processes alerts and notifications
- ✅ Upserts prices to `market_prices` table
- ❌ Does NOT broadcast prices (by design - frontend polls database every 500ms)

### 3. Database Query Window Too Restrictive (Secondary Issue)
**File:** `test-scripts/external-price-simulator.mjs`

The price ingestor requires an external service (e.g., DigitalOcean service or TraderMade API) to POST price data to:
```
POST https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/price-ingestor
Headers:
  X-INGEST-KEY: <INGEST_SECRET>
  Content-Type: application/json
Body:
  {
    "prices": [
      {
        "symbol": "XAUUSD",
        "price": 2025.50,
        "bid": 2025.45,
        "ask": 2025.55,
        "timestamp": "2025-11-05T..."
      }
    ]
  }
```

**Note:** User confirmed the external service IS running.

### 4. Database Query Too Restrictive (Secondary Issue)
**File:** `src/contexts/OptimizedWebSocketPriceContext.tsx:658`

**Original (60-second window):**
```typescript
.gte('updated_at', oneMinuteAgo) // Only fetch prices from last 60 seconds
```

If prices are older than 60 seconds (e.g., if external feed is temporarily down), the query returns empty results.

**Fix Applied (5-minute window):**
```typescript
.gte('updated_at', fiveMinutesAgo) // Accept prices from last 5 minutes
```

### 5. No Error Handling for Empty Results (Secondary Issue)
When the database query returned no results, the connection status remained "connecting" indefinitely, showing a loading skeleton forever.

**Fix Applied:**
```typescript
if (data.length === 0) {
  console.warn(`⚠️ No recent price data found`);
  setConnectionStatus('error');
  setError('No recent price data available. External price feed may be down.');
}
```

## Fixes Applied

### 1. **CRITICAL FIX: Fast Polling for Create Alerts Page**
**File:** `src/contexts/OptimizedWebSocketPriceContext.tsx:997-1022`

**Changes:**
- Added detection for `/new-signal` page (Create Alerts)
- Set polling interval to **500ms** for Create Alerts page (same as signal stream)
- Added better logging to show which page context is active

**Before:**
```
Create Alerts page: 30-second polling → Prices appear frozen
```

**After:**
```
Create Alerts page: 500ms polling → Live prices update smoothly
```

### 2. Extended Database Query Window
**File:** `src/contexts/OptimizedWebSocketPriceContext.tsx`

- Changed from 60-second to **5-minute window**
- Added detailed logging when no data is found
- Sets connection status to 'error' to show user-friendly message

### 3. Created Health Check Utility
**File:** `test-scripts/check-price-ingestor-health.mjs`

New diagnostic script that checks:
1. ✅ Database has recent price data
2. ✅ Price ingestor endpoint is accessible
3. ✅ External feed is actively sending updates

**Usage:**
```bash
cd test-scripts
export INGEST_SECRET=your-secret-key
export SUPABASE_ANON_KEY=your-anon-key
npm run health-check
```

### 4. Updated Test Scripts
**File:** `test-scripts/package.json`

Added health check command:
```json
"scripts": {
  "health-check": "node check-price-ingestor-health.mjs"
}
```

## How to Verify the Fix

### Step 1: Run Health Check
```bash
cd test-scripts
export INGEST_SECRET=<your-secret>
export SUPABASE_ANON_KEY=<your-anon-key>
npm run health-check
```

Expected output if working:
```
✅ All systems operational!
   Live prices should be displaying correctly.
```

Expected output if broken:
```
❌ Issues detected:
   • No recent price data in database
   • External price feed not sending updates
```

### Step 2: Start External Price Feed

**Option A: Production (DigitalOcean service)**
- Ensure the DigitalOcean price feed service is running
- Verify it's configured with correct `INGEST_SECRET`
- Check logs for connection errors

**Option B: Development (Test Simulator)**
```bash
cd test-scripts
export INGEST_SECRET=<your-secret>
npm run test:prices
```

This will send test prices every 2 seconds for 30 seconds.

### Step 3: Test Create Alerts
1. Navigate to Signal Stream page
2. Click "Create Alert"
3. Select an asset (Gold or Bitcoin)
4. **Expected:** Live price should appear within 500ms-2s

## Monitoring

### Check Database Directly
```sql
-- Check recent price updates
SELECT symbol, mid, bid, ask, updated_at
FROM market_prices
WHERE updated_at > NOW() - INTERVAL '5 minutes'
ORDER BY updated_at DESC
LIMIT 10;
```

### Check Price Ingestor Logs
```bash
# Supabase Dashboard > Edge Functions > price-ingestor > Logs
```

Look for:
- ✅ `✅ Authentication successful`
- ✅ `💾 STEP 2 COMPLETE: X upserts successful`
- ❌ `❌ Invalid or missing X-INGEST-KEY header`
- ❌ `❌ Database upsert failed`

## Architecture Flow

```
External Price Feed (DigitalOcean/TraderMade)
    ↓ (POST with X-INGEST-KEY)
Price Ingestor Edge Function
    ↓ (upsert_market_price_enhanced)
market_prices table
    ↓ (500ms polling + postgres_changes)
OptimizedWebSocketPriceContext
    ↓ (subscribe)
useOptimizedLivePrice hook
    ↓
EnhancedLivePriceDisplay component
    ↓
User sees live price in Create Alerts modal
```

## Common Issues

### Issue: "Connecting..." shows forever
**Cause:** External price feed not running
**Fix:** Start the external price feed service or run test simulator

### Issue: "No recent price data available"
**Cause:** Database has stale prices (>5 minutes old)
**Fix:**
1. Check external price feed is running
2. Verify INGEST_SECRET is correct
3. Check price ingestor logs for errors

### Issue: "Error" status but prices show
**Cause:** Cached prices from localStorage
**Fix:** This is expected - shows last known prices while waiting for fresh data

## Environment Variables Required

### Price Ingestor (Supabase Edge Function)
```
INGEST_SECRET=<secret-key-for-authentication>
SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

### External Price Feed (DigitalOcean/Test Simulator)
```
INGEST_SECRET=<same-secret-as-above>
SUPABASE_URL=https://kmuoqkcxguafxulqlbmi.supabase.co
```

### Frontend (Optional - for health check)
```
SUPABASE_ANON_KEY=<your-anon-key>
```

## Testing Checklist

- [ ] Health check shows all systems operational
- [ ] Database has prices updated in last 60 seconds
- [ ] External price feed is running (or test simulator)
- [ ] Create Alerts modal shows live prices
- [ ] Prices update every 1-2 seconds
- [ ] "Live" indicator shows (not "Connecting" or "Stale")
- [ ] Connection status is "connected"

## Rollback Plan

If issues persist, revert changes:

```bash
git checkout HEAD~1 -- src/contexts/OptimizedWebSocketPriceContext.tsx
```

Then investigate:
1. Check Supabase function logs
2. Verify external price feed configuration
3. Check database for recent price updates
4. Run health check script for detailed diagnostics
