# ============================================================================
# FAST STATUS CHECK - NO HANGING OPERATIONS
# ============================================================================
# Quick status check - no slow operations, all with timeouts
# ============================================================================

$ErrorActionPreference = "SilentlyContinue"

Write-Host "Quick Status Check..." -ForegroundColor Cyan

# 1. Generic MT5 Install (FAST - file check only)
$mt5Path = "C:\Program Files\MetaTrader 5\terminal64.exe"
if (Test-Path $mt5Path) {
    Write-Host "✅ Generic MT5: INSTALLED" -ForegroundColor Green
} else {
    Write-Host "❌ Generic MT5: NOT INSTALLED" -ForegroundColor Red
}

# 2. Generic MT5 Running (FAST - single command with error handling)
$mt5Proc = Get-Process -Name terminal64 -ErrorAction SilentlyContinue | Select-Object -First 1
if ($mt5Proc) {
    if ($mt5Proc.Path -like '*MetaTrader 5*' -and $mt5Proc.Path -notlike '*EC Markets*') {
        Write-Host "✅ Generic MT5: RUNNING (PID: $($mt5Proc.Id))" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Generic MT5: NOT RUNNING (EC Markets running instead)" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  Generic MT5: NOT RUNNING" -ForegroundColor Yellow
}

# 3. Broker Service (FAST - single command, minimal output)
$pm2Status = pm2 jlist 2>&1 | ConvertFrom-Json 2>$null | Where-Object { $_.name -eq "imperial-trade-broker-service" } | Select-Object -First 1
if ($pm2Status -and $pm2Status.pm2_env.status -eq "online") {
    Write-Host "✅ Broker Service: ONLINE" -ForegroundColor Green
} else {
    Write-Host "❌ Broker Service: NOT ONLINE" -ForegroundColor Red
}

# 4. Python MT5 (SKIP - too slow, can hang)
# Write-Host "⏭️  Python MT5: SKIPPED (can hang)" -ForegroundColor Gray

Write-Host ""
Write-Host "Done!" -ForegroundColor Cyan



