# Quick Verify Isolation - Check if fix was successful
# Run this on VPS to verify isolation is working

Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🔍 Quick Isolation Verification" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Check MT5 processes
Write-Host "1. Checking MT5 processes..." -ForegroundColor Yellow
$mt5Processes = Get-Process -Name terminal64 -ErrorAction SilentlyContinue
$processCount = $mt5Processes.Count

if ($processCount -eq 2) {
    Write-Host "   ✅ SUCCESS: 2 MT5 processes running (ISOLATED)" -ForegroundColor Green
    Write-Host "   Process IDs:" -ForegroundColor White
    foreach ($proc in $mt5Processes) {
        Write-Host "     - PID: $($proc.Id)" -ForegroundColor Gray
    }
} elseif ($processCount -eq 1) {
    Write-Host "   ⚠️  WARNING: Only 1 MT5 process (may still have conflict)" -ForegroundColor Yellow
} else {
    Write-Host "   ⚠️  Found $processCount MT5 process(es)" -ForegroundColor Yellow
}
Write-Host ""

# Check directories
Write-Host "2. Checking isolation directories..." -ForegroundColor Yellow
$priceFeederDir = Test-Path "C:\MT5_PriceFeeder"
$brokerServiceDir = Test-Path "C:\MT5_BrokerService"

if ($priceFeederDir) {
    Write-Host "   ✅ Price Feeder directory exists: C:\MT5_PriceFeeder" -ForegroundColor Green
} else {
    Write-Host "   ❌ Price Feeder directory missing: C:\MT5_PriceFeeder" -ForegroundColor Red
}

if ($brokerServiceDir) {
    Write-Host "   ✅ Broker Service directory exists: C:\MT5_BrokerService" -ForegroundColor Green
} else {
    Write-Host "   ❌ Broker Service directory missing: C:\MT5_BrokerService" -ForegroundColor Red
}
Write-Host ""

# Check PM2 services
Write-Host "3. Checking PM2 services..." -ForegroundColor Yellow
try {
    $pm2Status = pm2 jlist 2>$null | ConvertFrom-Json
    if ($pm2Status) {
        $priceFeeder = $pm2Status | Where-Object { $_.name -like "*price*feeder*" -or $_.name -like "*price-feeder*" }
        $brokerService = $pm2Status | Where-Object { $_.name -like "*broker*service*" -or $_.name -like "*broker-service*" }
        
        if ($priceFeeder) {
            Write-Host "   ✅ Price Feeder: $($priceFeeder.pm2_env.status)" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  Price Feeder not found in PM2" -ForegroundColor Yellow
        }
        
        if ($brokerService) {
            Write-Host "   ✅ Broker Service: $($brokerService.pm2_env.status)" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  Broker Service not found in PM2" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "   ⚠️  Could not check PM2 status" -ForegroundColor Yellow
}
Write-Host ""

# Final verdict
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
if ($processCount -eq 2 -and $priceFeederDir -and $brokerServiceDir) {
    Write-Host "✅ ISOLATION SUCCESSFUL!" -ForegroundColor Green
    Write-Host "   Error [32] should be resolved" -ForegroundColor Green
    Write-Host "   Connection test should work now" -ForegroundColor Green
} else {
    Write-Host "⚠️  ISOLATION INCOMPLETE" -ForegroundColor Yellow
    Write-Host "   Run: .\FIX_MT5_ISOLATION.ps1" -ForegroundColor Yellow
}
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
