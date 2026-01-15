# 🔍 Complete VPS and Live Price System Verification

## 🎯 Overview

This document provides a **complete verification checklist** for the entire live price system following all MD files in the repository.

---

## 📋 PART 1: VPS Verification (Run on VPS)

### Step 1: Connect to VPS

**VPS IP**: `45.32.89.134`

**Connect via**:
- Vultr Web Console: https://my.vultr.com → View Console
- OR RDP: `45.32.89.134:3389` (Username: Administrator)

---

### Step 2: Run Complete VPS Verification Script

**Open PowerShell as Administrator on VPS** and run:

```powershell
# Complete VPS Verification Script
Write-Host "=== COMPLETE VPS VERIFICATION ===" -ForegroundColor Cyan
Write-Host "Date: $(Get-Date)" -ForegroundColor Gray
Write-Host ""

# 1. CHECK EC MARKETS MT5 (Live Price Feed)
Write-Host "1. EC Markets MT5 (Live Price Feed):" -ForegroundColor Yellow
$ecMarkets = Get-Process -Name "terminal64" -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*EC Markets*" }
if ($ecMarkets) {
    Write-Host "   ✅ RUNNING" -ForegroundColor Green
    Write-Host "   PID: $($ecMarkets.Id)" -ForegroundColor Gray
    Write-Host "   Path: $($ecMarkets.Path)" -ForegroundColor Gray
    $uptime = (Get-Date) - $ecMarkets.StartTime
    Write-Host "   Uptime: $($uptime.Hours)h $($uptime.Minutes)m" -ForegroundColor Gray
} else {
    Write-Host "   ❌ NOT RUNNING" -ForegroundColor Red
    Write-Host "   ⚠️  ACTION REQUIRED: Start EC Markets MT5" -ForegroundColor Yellow
}

# 2. CHECK PRICE FEEDER SERVICE (PM2)
Write-Host "`n2. Imperial Price Feeder Service:" -ForegroundColor Yellow
$priceFeeder = pm2 list | Select-String "Imperial Price Feeder"
if ($priceFeeder) {
    Write-Host "   ✅ FOUND IN PM2" -ForegroundColor Green
    pm2 list | Select-String "Imperial Price Feeder" -Context 0,1
} else {
    Write-Host "   ❌ NOT RUNNING" -ForegroundColor Red
    Write-Host "   ⚠️  ACTION REQUIRED: Start Price Feeder" -ForegroundColor Yellow
}

# 3. CHECK PRICE FEEDER .ENV CONFIGURATION
Write-Host "`n3. Price Feeder Configuration:" -ForegroundColor Yellow
$priceFeederPath = "C:\imperial-price-feeder\.env"
if (Test-Path $priceFeederPath) {
    Write-Host "   ✅ .env FILE EXISTS" -ForegroundColor Green
    $envContent = Get-Content $priceFeederPath | Select-String "INGEST_SECRET|SUPABASE_FUNCTION_URL"
    Write-Host "   Configuration:" -ForegroundColor Gray
    $envContent | ForEach-Object {
        if ($_ -match "INGEST_SECRET") {
            $secret = $_ -replace "INGEST_SECRET=", ""
            Write-Host "   INGEST_SECRET: $($secret.Substring(0, [Math]::Min(20, $secret.Length)))..." -ForegroundColor Gray
        } else {
            Write-Host "   $_" -ForegroundColor Gray
        }
    }
    
    # Verify INGEST_SECRET matches expected value
    $ingestSecret = (Get-Content $priceFeederPath | Select-String "INGEST_SECRET=") -replace "INGEST_SECRET=", ""
    if ($ingestSecret -eq "ImperialTrade_IngestSecret_2025_v1") {
        Write-Host "   ✅ INGEST_SECRET MATCHES" -ForegroundColor Green
    } else {
        Write-Host "   ❌ INGEST_SECRET MISMATCH" -ForegroundColor Red
        Write-Host "   Expected: ImperialTrade_IngestSecret_2025_v1" -ForegroundColor Yellow
        Write-Host "   Found: $ingestSecret" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ❌ .env FILE NOT FOUND" -ForegroundColor Red
    Write-Host "   Location: $priceFeederPath" -ForegroundColor Gray
}

# 4. CHECK PRICE FEEDER LOGS (Last 20 lines)
Write-Host "`n4. Price Feeder Recent Logs:" -ForegroundColor Yellow
try {
    $logs = pm2 logs "Imperial Price Feeder" --lines 20 --nostream 2>&1
    if ($logs) {
        Write-Host "   Recent Activity:" -ForegroundColor Gray
        $logs | Select-Object -Last 10 | ForEach-Object {
            if ($_ -match "error|Error|ERROR|failed|Failed|FAILED") {
                Write-Host "   ❌ $_" -ForegroundColor Red
            } elseif ($_ -match "success|Success|SUCCESS|authenticated|Authenticated") {
                Write-Host "   ✅ $_" -ForegroundColor Green
            } else {
                Write-Host "   ℹ️  $_" -ForegroundColor Gray
            }
        }
    }
} catch {
    Write-Host "   ⚠️  Could not fetch logs" -ForegroundColor Yellow
}

# 5. CHECK MT5 INSTALLATION PATH
Write-Host "`n5. MT5 Installation Paths:" -ForegroundColor Yellow
$ecPath = "C:\Program Files\EC Markets MetaTrader 5\terminal64.exe"
if (Test-Path $ecPath) {
    Write-Host "   ✅ EC Markets MT5: $ecPath" -ForegroundColor Green
} else {
    Write-Host "   ❌ EC Markets MT5: NOT FOUND" -ForegroundColor Red
    Write-Host "   Expected: $ecPath" -ForegroundColor Gray
}

# 6. CHECK PM2 SERVICE STATUS
Write-Host "`n6. All PM2 Services:" -ForegroundColor Yellow
pm2 list

# 7. CHECK NETWORK CONNECTIVITY TO SUPABASE
Write-Host "`n7. Network Connectivity:" -ForegroundColor Yellow
$supabaseUrl = "https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/price-ingestor"
try {
    $response = Invoke-WebRequest -Uri $supabaseUrl -Method OPTIONS -TimeoutSec 5 -ErrorAction Stop
    Write-Host "   ✅ Supabase Reachable (Status: $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Supabase Not Reachable" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Gray
}

Write-Host "`n=== VPS VERIFICATION COMPLETE ===" -ForegroundColor Cyan
```

---

## 📋 PART 2: Supabase Verification (Check in Supabase Dashboard)

### Step 1: Check Edge Function Secrets

1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi
2. Navigate to: **Edge Functions** → **Settings** → **Secrets**
3. Verify `INGEST_SECRET` exists with value: `ImperialTrade_IngestSecret_2025_v1`

**✅ Expected**: Secret exists and matches VPS value

---

### Step 2: Check Edge Function Logs

1. Navigate to: **Edge Functions** → **price-ingestor** → **Logs**
2. Check for:
   - ✅ Recent requests (last 1-5 minutes)
   - ✅ Success responses (200 OK)
   - ✅ Authentication successful messages
   - ❌ Check for 401 errors (authentication failures)
   - ❌ Check for 500 errors (server errors)

**✅ Expected**: 
- Multiple requests per minute
- All responses are 200 OK
- "✅ Authentication successful" in logs
- "📊 Received X prices" messages

---

### Step 3: Check Database for Recent Prices

**Run this SQL in Supabase SQL Editor**:

```sql
-- Check recent price updates
SELECT 
    symbol,
    mid as price,
    bid,
    ask,
    updated_at,
    NOW() - updated_at as age,
    CASE 
        WHEN NOW() - updated_at < INTERVAL '10 seconds' THEN '✅ VERY RECENT'
        WHEN NOW() - updated_at < INTERVAL '1 minute' THEN '✅ RECENT'
        WHEN NOW() - updated_at < INTERVAL '5 minutes' THEN '⚠️ OLD'
        ELSE '❌ STALE'
    END as status
FROM market_prices
ORDER BY updated_at DESC
LIMIT 20;
```

**✅ Expected**:
- Prices updated within last 10 seconds
- Multiple symbols (XAUUSD, BTCUSD, etc.)
- All statuses should be "✅ VERY RECENT" or "✅ RECENT"

---

### Step 4: Check Price Ingestion Frequency

**Run this SQL**:

```sql
-- Check price update frequency by symbol
SELECT 
    symbol,
    COUNT(*) as update_count,
    MIN(updated_at) as first_update,
    MAX(updated_at) as last_update,
    MAX(updated_at) - MIN(updated_at) as time_span,
    ROUND(COUNT(*)::numeric / NULLIF(EXTRACT(EPOCH FROM (MAX(updated_at) - MIN(updated_at))), 0) * 60, 2) as updates_per_minute
FROM market_prices
WHERE updated_at > NOW() - INTERVAL '10 minutes'
GROUP BY symbol
ORDER BY last_update DESC;
```

**✅ Expected**:
- Multiple symbols being updated
- Updates per minute > 0 (ideally 10-60 updates/minute)
- Recent `last_update` timestamps

---

## 📋 PART 3: Frontend Verification (Check in Browser)

### Step 1: Check Browser Console for Price Updates

1. Open your app in browser
2. Open Developer Tools (F12)
3. Go to Console tab
4. Navigate to a page with live prices (e.g., `/signal-stream`)
5. Look for console logs like:
   - `📥 [Realtime] Received update for symbol: XAUUSD`
   - `⚡ [Realtime INSERT] XAUUSD: $2670.50`
   - `✅ [Realtime] Applied instant update`

**✅ Expected**: 
- Continuous price update logs
- No connection errors
- Prices updating every few seconds

---

### Step 2: Check Network Tab for Realtime Connection

1. Open Developer Tools → **Network** tab
2. Filter by **WS** (WebSocket)
3. Look for `realtime` connections
4. Check connection status (should be "101 Switching Protocols")

**✅ Expected**: 
- Active WebSocket connection
- Connection status: Connected
- No connection errors

---

### Step 3: Verify Connection Status in UI

1. Look at live price widgets/components
2. Check connection status indicators
3. Should show: **"Connected"** or **"Live"**

**✅ Expected**: 
- Connection status shows "Connected"
- No "Disconnected" or "Error" states
- Prices are updating

---

## 📋 PART 4: Complete System Health Check

### Run This Query in Supabase SQL Editor

```sql
-- Complete System Health Check
WITH recent_prices AS (
    SELECT 
        symbol,
        MAX(updated_at) as last_update,
        COUNT(*) as recent_count
    FROM market_prices
    WHERE updated_at > NOW() - INTERVAL '5 minutes'
    GROUP BY symbol
),
price_status AS (
    SELECT 
        symbol,
        last_update,
        recent_count,
        NOW() - last_update as age,
        CASE 
            WHEN NOW() - last_update < INTERVAL '10 seconds' THEN '✅ HEALTHY'
            WHEN NOW() - last_update < INTERVAL '1 minute' THEN '⚠️ SLOW'
            WHEN NOW() - last_update < INTERVAL '5 minutes' THEN '❌ DEGRADED'
            ELSE '❌ DOWN'
        END as health_status
    FROM recent_prices
)
SELECT 
    COUNT(*) as total_symbols,
    COUNT(*) FILTER (WHERE health_status = '✅ HEALTHY') as healthy_symbols,
    COUNT(*) FILTER (WHERE health_status = '⚠️ SLOW') as slow_symbols,
    COUNT(*) FILTER (WHERE health_status LIKE '❌%') as down_symbols,
    MIN(age) as youngest_update,
    MAX(age) as oldest_update
FROM price_status;
```

**✅ Expected**:
- `total_symbols` > 0
- `healthy_symbols` > 0 (most symbols should be healthy)
- `youngest_update` < 10 seconds
- `down_symbols` = 0

---

## 🚨 Troubleshooting Guide

### Issue 1: VPS Price Feeder Not Running

**Symptoms**:
- No recent prices in database
- Edge Function logs show no incoming requests

**Solution**:
```powershell
# On VPS
cd C:\imperial-price-feeder
pm2 restart "Imperial Price Feeder"
pm2 logs "Imperial Price Feeder" --lines 50
```

---

### Issue 2: INGEST_SECRET Mismatch

**Symptoms**:
- Edge Function logs show 401 errors
- VPS logs show authentication failures

**Solution**:
1. **Check VPS .env**: `C:\imperial-price-feeder\.env`
   - Should have: `INGEST_SECRET=ImperialTrade_IngestSecret_2025_v1`

2. **Check Supabase Secret**: Dashboard → Edge Functions → Settings → Secrets
   - Should have: `INGEST_SECRET` = `ImperialTrade_IngestSecret_2025_v1`

3. **Restart Price Feeder after fixing**:
   ```powershell
   pm2 restart "Imperial Price Feeder"
   ```

---

### Issue 3: EC Markets MT5 Not Running

**Symptoms**:
- Price Feeder logs show "MT5 not initialized" or connection errors

**Solution**:
```powershell
# On VPS - Start EC Markets MT5
Start-Process "C:\Program Files\EC Markets MetaTrader 5\terminal64.exe"

# Verify it's running
Get-Process -Name "terminal64" | Where-Object { $_.Path -like "*EC Markets*" }
```

---

### Issue 4: Frontend Not Receiving Prices

**Symptoms**:
- Database has recent prices
- But frontend shows no prices or "Disconnected"

**Solution**:
1. **Check Realtime subscription** in browser console
2. **Verify Supabase Realtime is enabled** (should be by default)
3. **Check connection status** - might need to refresh page
4. **Check for WebSocket connection errors** in Network tab

---

## ✅ Success Criteria

### All Systems Healthy When:

- ✅ **VPS**: EC Markets MT5 running, Price Feeder PM2 service online
- ✅ **VPS**: INGEST_SECRET matches Supabase value
- ✅ **Supabase**: Edge Function receiving requests every few seconds
- ✅ **Supabase**: Edge Function logs show 200 OK responses
- ✅ **Database**: Recent prices (< 10 seconds old) for multiple symbols
- ✅ **Frontend**: Console shows price update logs
- ✅ **Frontend**: WebSocket connection established
- ✅ **Frontend**: UI shows live prices updating

---

## 📝 Next Steps After Verification

1. ✅ If all checks pass: System is working correctly!
2. ⚠️ If some checks fail: Follow troubleshooting guide above
3. 📊 Monitor for 5-10 minutes to ensure stability
4. 🔄 Run verification script periodically to check health

---

## 🎯 Quick Verification Command (VPS)

**One-liner to check everything quickly**:

```powershell
Write-Host "MT5: $((Get-Process 'terminal64' -ErrorAction SilentlyContinue | Where-Object {$_.Path -like '*EC Markets*'}).Count) running | PM2: $((pm2 list | Select-String 'Imperial Price Feeder').Count) found | DB Check: Run SQL query in Supabase"
```

---

**Last Updated**: Based on all MD files in repository  
**VPS IP**: 45.32.89.134  
**Supabase Project**: kmuoqkcxguafxulqlbmi




