# ============================================================================
# CHECK EXISTING PRICE FEEDER STATUS
# ============================================================================
# This script checks the existing Price Feeder service on VPS
# Run this on VPS to see what's currently running
# ============================================================================

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  CHECKING EXISTING PRICE FEEDER STATUS" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check PM2 Services
Write-Host "[1/7] Checking PM2 Services..." -ForegroundColor Yellow
pm2 list
Write-Host ""

# 2. Check Price Feeder Service
Write-Host "[2/7] Checking Imperial Price Feeder Service..." -ForegroundColor Yellow
$priceFeeder = pm2 list | Select-String "Imperial Price Feeder"
if ($priceFeeder) {
    Write-Host "   ✅ Imperial Price Feeder FOUND in PM2" -ForegroundColor Green
    $status = pm2 jlist | ConvertFrom-Json | Where-Object { $_.name -eq "Imperial Price Feeder" }
    if ($status) {
        Write-Host "   Status: $($status.pm2_env.status)" -ForegroundColor Gray
        Write-Host "   Uptime: $($status.pm2_env.pm_uptime)" -ForegroundColor Gray
        Write-Host "   Restarts: $($status.pm2_env.restart_time)" -ForegroundColor Gray
        Write-Host "   Script: $($status.pm2_env.pm_exec_path)" -ForegroundColor Gray
    }
} else {
    Write-Host "   ❌ Imperial Price Feeder NOT FOUND in PM2" -ForegroundColor Red
}
Write-Host ""

# 3. Check Price Feeder Directory
Write-Host "[3/7] Checking Price Feeder Directory..." -ForegroundColor Yellow
$feederDir = "C:\imperial-price-feeder"
if (Test-Path $feederDir) {
    Write-Host "   ✅ Directory exists: $feederDir" -ForegroundColor Green
    Get-ChildItem $feederDir -Directory | ForEach-Object {
        Write-Host "   📁 $($_.Name)" -ForegroundColor Gray
    }
} else {
    Write-Host "   ❌ Directory NOT FOUND: $feederDir" -ForegroundColor Red
}
Write-Host ""

# 4. Check .env File
Write-Host "[4/7] Checking .env Configuration..." -ForegroundColor Yellow
$envPath = "$feederDir\.env"
if (Test-Path $envPath) {
    Write-Host "   ✅ .env file exists" -ForegroundColor Green
    $envContent = Get-Content $envPath
    Write-Host "   Configuration:" -ForegroundColor Gray
    $envContent | ForEach-Object {
        if ($_ -match "INGEST_SECRET") {
            $secret = $_ -replace "INGEST_SECRET=", ""
            Write-Host "   INGEST_SECRET: $($secret.Substring(0, [Math]::Min(20, $secret.Length)))..." -ForegroundColor Gray
        } elseif ($_ -match "SUPABASE_FUNCTION_URL") {
            Write-Host "   $_" -ForegroundColor Gray
        } elseif ($_ -match "SYMBOLS") {
            Write-Host "   $_" -ForegroundColor Gray
        }
    }
} else {
    Write-Host "   ❌ .env file NOT FOUND" -ForegroundColor Red
}
Write-Host ""

# 5. Check Price Feeder Logs
Write-Host "[5/7] Checking Price Feeder Logs (Last 20 lines)..." -ForegroundColor Yellow
try {
    $logs = pm2 logs "Imperial Price Feeder" --lines 20 --nostream 2>&1
    if ($logs) {
        Write-Host "   Recent Logs:" -ForegroundColor Gray
        $logs | Select-Object -Last 15 | ForEach-Object {
            if ($_ -match "error|Error|ERROR|failed|Failed|FAILED") {
                Write-Host "   ❌ $_" -ForegroundColor Red
            } elseif ($_ -match "success|Success|SUCCESS|sent|Sent|Sent|✅") {
                Write-Host "   ✅ $_" -ForegroundColor Green
            } elseif ($_ -match "Starting|started|running|Running") {
                Write-Host "   🚀 $_" -ForegroundColor Cyan
            } else {
                Write-Host "   ℹ️  $_" -ForegroundColor Gray
            }
        }
    } else {
        Write-Host "   ⚠️  No logs available" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ⚠️  Could not fetch logs: $($_.Exception.Message)" -ForegroundColor Yellow
}
Write-Host ""

# 6. Check EC Markets MT5
Write-Host "[6/7] Checking EC Markets MT5..." -ForegroundColor Yellow
$mt5Process = Get-Process -Name "terminal64" -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*EC Markets*" }
if ($mt5Process) {
    Write-Host "   ✅ EC Markets MT5 is RUNNING" -ForegroundColor Green
    Write-Host "   PID: $($mt5Process.Id)" -ForegroundColor Gray
    Write-Host "   Path: $($mt5Process.Path)" -ForegroundColor Gray
    $uptime = (Get-Date) - $mt5Process.StartTime
    Write-Host "   Uptime: $($uptime.Hours)h $($uptime.Minutes)m" -ForegroundColor Gray
} else {
    Write-Host "   ❌ EC Markets MT5 NOT RUNNING" -ForegroundColor Red
    Write-Host "   ⚠️  ACTION REQUIRED: Start EC Markets MT5" -ForegroundColor Yellow
}
Write-Host ""

# 7. Check Network Connectivity
Write-Host "[7/7] Checking Network Connectivity..." -ForegroundColor Yellow
$supabaseUrl = "https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/price-ingestor"
try {
    $response = Invoke-WebRequest -Uri $supabaseUrl -Method OPTIONS -TimeoutSec 5 -ErrorAction Stop
    Write-Host "   ✅ Supabase Reachable (Status: $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Supabase Not Reachable" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Gray
}
Write-Host ""

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  STATUS CHECK COMPLETE" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Recommendations
Write-Host "Recommendations:" -ForegroundColor Yellow
$needsRestart = $false

if (-not $priceFeeder) {
    Write-Host "   ⚠️  Price Feeder service not running - needs to be started" -ForegroundColor Yellow
    $needsRestart = $true
} elseif ($status.pm2_env.status -ne 'online') {
    Write-Host "   ⚠️  Price Feeder service status: $($status.pm2_env.status) - may need restart" -ForegroundColor Yellow
    $needsRestart = $true
}

if (-not $mt5Process) {
    Write-Host "   ⚠️  EC Markets MT5 not running - Price Feeder won't work" -ForegroundColor Yellow
}

if ($needsRestart) {
    Write-Host ""
    Write-Host "To restart Price Feeder:" -ForegroundColor White
    Write-Host "   cd C:\imperial-price-feeder" -ForegroundColor Gray
    Write-Host "   pm2 restart 'Imperial Price Feeder'" -ForegroundColor Gray
}

Write-Host ""




