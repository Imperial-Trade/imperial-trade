# Debug: Pattern Stream Not Showing Live Prices

## Current Status

✅ **Price Feeder**: Streaming prices (486 published, 6.5/sec)
✅ **Database**: Prices updating in real-time (XAUUSD, BTCUSD, etc.)
❌ **Pattern Stream**: Not displaying live prices

## Diagnosis Steps

### 1. Check Browser Console (F12)

Open the Pattern Stream page and check the browser console for:

**Expected Logs:**
```
⚡ [Realtime] Setting up postgres_changes subscription for market_prices
⚡ [Realtime] Subscription status: SUBSCRIBED
✅ [Realtime] Successfully subscribed to market_prices postgres_changes
📥 [Realtime] Received update for symbol: XAUUSD -> normalized: XAUUSD
⚡ [Realtime UPDATE] XAUUSD: $4464.82 (instant update from postgres_changes)
```

**Error Logs to Look For:**
```
❌ [Realtime] Subscription failed: CHANNEL_ERROR
❌ [Realtime] Subscription failed: TIMED_OUT
```

### 2. Check Connection Status

On the Pattern Stream page, look for:
- Connection indicator showing "Connected" or "Live"
- If it shows "Disconnected" or "Error", that's the issue

### 3. Verify Supabase Realtime is Enabled

The `market_prices` table needs Realtime enabled in Supabase:
1. Go to Supabase Dashboard
2. Database → Replication
3. Find `market_prices` table
4. Ensure it's enabled for Realtime

### 4. Check if Prices are Subscribed

In browser console, look for:
```
🚀 SignalStream - Subscribing to symbols: ['XAUUSD', 'BTCUSD', ...]
```

## Quick Fixes

### Fix 1: Refresh the Page
Sometimes the subscription needs a refresh to reconnect.

### Fix 2: Check Supabase Realtime Settings
Ensure `market_prices` table has Realtime enabled in Supabase Dashboard.

### Fix 3: Check Browser Console Errors
Any JavaScript errors will prevent the subscription from working.

## What's Working

- ✅ Price Feeder is streaming (486 prices published)
- ✅ Database has latest prices (updated seconds ago)
- ✅ Edge Function is processing prices (200 OK responses)

## What Might Be Broken

- ❌ Supabase Realtime subscription not connecting
- ❌ Browser console errors preventing subscription
- ❌ Realtime not enabled for `market_prices` table
- ❌ Symbol normalization mismatch
