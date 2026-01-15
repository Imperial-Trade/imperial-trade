# ============================================================================
# VERIFY MT5 ISOLATION - Price Feeder vs Broker Service
# ============================================================================
# This script checks that both MT5 instances are properly separated
# ============================================================================

Write-Host ""
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "  MT5 ISOLATION VERIFICATION" -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""

# Get all MT5 processes
$mt5Processes = Get-Process -Name terminal64 -ErrorAction SilentlyContinue

if (-not $mt5Processes) {
    Write-Host "❌ No MT5 processes running!" -ForegroundColor Red
    exit 1
}

Write-Host "Found $($mt5Processes.Count) MT5 process(es):" -ForegroundColor Yellow
Write-Host ""

$brokerServiceCount = 0
$priceFeedCount = 0
$ecMarketsCount = 0
$unknownCount = 0

foreach ($proc in $mt5Processes) {
    $path = $proc.Path
    
    Write-Host "  PID: $($proc.Id)" -ForegroundColor Gray
    Write-Host "  Path: $path" -ForegroundColor Gray
    
    if ($path -like "*MT5_BrokerService*") {
        Write-Host "  Type: BROKER SERVICE (Portable)" -ForegroundColor Green
        $brokerServiceCount++
    } elseif ($path -like "*MT5_PriceFeeder*") {
        Write-Host "  Type: PRICE FEEDER (Portable)" -ForegroundColor Green
        $priceFeedCount++
    } elseif ($path -like "*EC Markets*" -or $path -like "*ECMarkets*") {
        Write-Host "  Type: EC MARKETS MT5 (Price Feeder)" -ForegroundColor Cyan
        $ecMarketsCount++
    } elseif ($path -like "*Program Files*MetaTrader 5*") {
        Write-Host "  Type: GENERIC MT5 (Program Files)" -ForegroundColor Yellow
        $unknownCount++
    } else {
        Write-Host "  Type: UNKNOWN" -ForegroundColor Red
        $unknownCount++
    }
    Write-Host ""
}

Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "  SUMMARY" -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Broker Service MT5 (C:\MT5_BrokerService): $brokerServiceCount" -ForegroundColor $(if ($brokerServiceCount -ge 1) { "Green" } else { "Red" })
Write-Host "  Price Feeder MT5 (EC Markets or C:\MT5_PriceFeeder): $($priceFeedCount + $ecMarketsCount)" -ForegroundColor $(if (($priceFeedCount + $ecMarketsCount) -ge 1) { "Green" } else { "Yellow" })
Write-Host "  Unknown/Generic: $unknownCount" -ForegroundColor $(if ($unknownCount -eq 0) { "Green" } else { "Yellow" })
Write-Host ""

# Check expected configuration
if ($brokerServiceCount -ge 1 -and ($priceFeedCount + $ecMarketsCount) -ge 1) {
    Write-Host "✅ PROPER ISOLATION: Both services are running on separate MT5 instances!" -ForegroundColor Green
} elseif ($brokerServiceCount -ge 1 -and ($priceFeedCount + $ecMarketsCount) -eq 0) {
    Write-Host "⚠️  WARNING: Broker Service is isolated, but Price Feeder may not be running" -ForegroundColor Yellow
    Write-Host "   Expected: EC Markets MT5 or C:\MT5_PriceFeeder for price feeding" -ForegroundColor Yellow
} elseif ($brokerServiceCount -eq 0) {
    Write-Host "❌ ERROR: No Broker Service MT5 found at C:\MT5_BrokerService" -ForegroundColor Red
    Write-Host "   Run the Nuclear Fix script to set it up" -ForegroundColor Yellow
} else {
    Write-Host "⚠️  CONFIGURATION MAY NEED REVIEW" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "  EXPECTED ARCHITECTURE" -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  PRICE FEEDER (Live Prices)" -ForegroundColor Cyan
Write-Host "  ├── Location: EC Markets MT5 OR C:\MT5_PriceFeeder" -ForegroundColor Gray
Write-Host "  ├── Account: EC Markets (81071266)" -ForegroundColor Gray
Write-Host "  ├── Purpose: Stream live gold prices to Supabase" -ForegroundColor Gray
Write-Host "  └── PM2: Imperial Price Feeder" -ForegroundColor Gray
Write-Host ""
Write-Host "  BROKER SERVICE (User Connections)" -ForegroundColor Cyan
Write-Host "  ├── Location: C:\MT5_BrokerService (PORTABLE)" -ForegroundColor Gray
Write-Host "  ├── Account: User's broker account (XS, ECMarkets, PUPrime)" -ForegroundColor Gray
Write-Host "  ├── Purpose: Test connections, fetch trades for Journal XX Pro" -ForegroundColor Gray
Write-Host "  └── PM2: imperial-trade-broker-service" -ForegroundColor Gray
Write-Host ""
Write-Host "  KEY DIFFERENCES:" -ForegroundColor Yellow
Write-Host "  • Price Feeder: Single account, always connected, streaming prices" -ForegroundColor Gray
Write-Host "  • Broker Service: Multiple users, on-demand connections, fetch trades" -ForegroundColor Gray
Write-Host "  • They MUST be separate to avoid file locks (Error 32)" -ForegroundColor Gray
Write-Host ""
