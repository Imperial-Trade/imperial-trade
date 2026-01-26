# ============================================================================
# COMPLETE VERIFICATION - Check EVERYTHING Actually Implemented
# ============================================================================
# This script verifies what's ACTUALLY on the VPS vs what should be there
# ============================================================================

Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🔍 COMPLETE VERIFICATION - What's ACTUALLY Implemented" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$issues = @()
$passed = @()

# ============================================================================
# 1. CHECK FILES THAT SHOULD EXIST
# ============================================================================
Write-Host "1. CHECKING FILES ON VPS:" -ForegroundColor Yellow
Write-Host ""

$requiredFiles = @(
    @{Path="C:\vps-broker-service\vps-setup\QUICK_CHECK_JOURNAL_XX_PRO.ps1"; Name="Quick Check Script"},
    @{Path="C:\vps-broker-service\vps-setup\VERIFY_AND_ENSURE_24_7.ps1"; Name="Price Feeder Verification"},
    @{Path="C:\vps-broker-service\vps-setup\DEPLOY_TO_VPS.ps1"; Name="Deploy Script"},
    @{Path="C:\vps-broker-service\dist\index.js"; Name="Broker Service (compiled)"},
    @{Path="C:\vps-broker-service\python\test_connection.py"; Name="Python Test Connection"},
    @{Path="C:\vps-broker-service\python\fetch_trades.py"; Name="Python Fetch Trades"},
    @{Path="C:\MT5_BrokerService\terminal64.exe"; Name="MT5 Broker Service Executable"},
    @{Path="C:\imperial-price-feeder\watchdogs\price-feeder-watchdog.js"; Name="Price Feeder Watchdog"}
)

foreach ($file in $requiredFiles) {
    if (Test-Path $file.Path) {
        Write-Host "   ✅ $($file.Name)" -ForegroundColor Green
        Write-Host "      Path: $($file.Path)" -ForegroundColor Gray
        $passed += $file.Name
    } else {
        Write-Host "   ❌ $($file.Name) - MISSING!" -ForegroundColor Red
        Write-Host "      Expected: $($file.Path)" -ForegroundColor Yellow
        $issues += "$($file.Name) missing at $($file.Path)"
    }
}

Write-Host ""

# ============================================================================
# 2. CHECK PM2 SERVICES
# ============================================================================
Write-Host "2. CHECKING PM2 SERVICES:" -ForegroundColor Yellow
Write-Host ""

$pm2Status = pm2 status 2>&1

if ($pm2Status -match "imperial-trade-broker-service") {
    if ($pm2Status -match "imperial-trade-broker-service.*online") {
        Write-Host "   ✅ Broker Service: ONLINE" -ForegroundColor Green
        $passed += "Broker Service Running"
    } else {
        Write-Host "   ❌ Broker Service: NOT ONLINE" -ForegroundColor Red
        $issues += "Broker Service not running"
    }
} else {
    Write-Host "   ❌ Broker Service: NOT FOUND IN PM2" -ForegroundColor Red
    $issues += "Broker Service not in PM2"
}

if ($pm2Status -match "Imperial Price Feeder") {
    if ($pm2Status -match "Imperial Price Feeder.*online") {
        Write-Host "   ✅ Price Feeder: ONLINE" -ForegroundColor Green
        $passed += "Price Feeder Running"
    } else {
        Write-Host "   ⚠️  Price Feeder: NOT ONLINE" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ⚠️  Price Feeder: NOT FOUND IN PM2" -ForegroundColor Yellow
}

Write-Host ""

# ============================================================================
# 3. CHECK PORTS
# ============================================================================
Write-Host "3. CHECKING PORTS:" -ForegroundColor Yellow
Write-Host ""

$port3001 = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
if ($port3001) {
    Write-Host "   ✅ Port 3001: LISTENING" -ForegroundColor Green
    $passed += "Port 3001 Listening"
} else {
    Write-Host "   ❌ Port 3001: NOT LISTENING" -ForegroundColor Red
    $issues += "Port 3001 not listening"
}

Write-Host ""

# ============================================================================
# 4. CHECK MT5 PROCESSES
# ============================================================================
Write-Host "4. CHECKING MT5 PROCESSES:" -ForegroundColor Yellow
Write-Host ""

$mt5Broker = Get-Process -Name terminal64 -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*MT5_BrokerService*" }
if ($mt5Broker) {
    Write-Host "   ✅ MT5 Broker Service: RUNNING" -ForegroundColor Green
    Write-Host "      Path: $($mt5Broker.Path)" -ForegroundColor Gray
    $passed += "MT5 Broker Service Running"
} else {
    Write-Host "   ❌ MT5 Broker Service: NOT RUNNING" -ForegroundColor Red
    $issues += "MT5 Broker Service not running"
}

$mt5PriceFeeder = Get-Process -Name terminal64 -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*Program Files*MetaTrader 5*" }
if ($mt5PriceFeeder) {
    Write-Host "   ✅ MT5 Price Feeder: RUNNING" -ForegroundColor Green
    $passed += "MT5 Price Feeder Running"
} else {
    Write-Host "   ⚠️  MT5 Price Feeder: NOT RUNNING (optional)" -ForegroundColor Yellow
}

Write-Host ""

# ============================================================================
# 5. CHECK DIRECTORIES
# ============================================================================
Write-Host "5. CHECKING DIRECTORIES:" -ForegroundColor Yellow
Write-Host ""

$requiredDirs = @(
    @{Path="C:\MT5_BrokerService"; Name="MT5 Broker Service Directory"},
    @{Path="C:\vps-broker-service"; Name="Broker Service Code Directory"},
    @{Path="C:\vps-broker-service\vps-setup"; Name="VPS Setup Scripts"},
    @{Path="C:\vps-broker-service\python"; Name="Python Scripts"},
    @{Path="C:\imperial-price-feeder"; Name="Price Feeder Directory"}
)

foreach ($dir in $requiredDirs) {
    if (Test-Path $dir.Path) {
        Write-Host "   ✅ $($dir.Name)" -ForegroundColor Green
        $passed += $dir.Name
    } else {
        Write-Host "   ❌ $($dir.Name) - MISSING!" -ForegroundColor Red
        Write-Host "      Expected: $($dir.Path)" -ForegroundColor Yellow
        $issues += "$($dir.Name) missing at $($dir.Path)"
    }
}

Write-Host ""

# ============================================================================
# 6. CHECK CODE REFERENCES (MT5_BrokerService paths)
# ============================================================================
Write-Host "6. CHECKING CODE REFERENCES:" -ForegroundColor Yellow
Write-Host ""

$terminalManager = "C:\vps-broker-service\src\terminal-manager.ts"
if (Test-Path $terminalManager) {
    $content = Get-Content $terminalManager -Raw
    if ($content -match "C:\\MT5_BrokerService") {
        Write-Host "   ✅ terminal-manager.ts uses C:\MT5_BrokerService" -ForegroundColor Green
        $passed += "Code References Correct"
    } else {
        Write-Host "   ❌ terminal-manager.ts does NOT use C:\MT5_BrokerService" -ForegroundColor Red
        $issues += "Code references incorrect in terminal-manager.ts"
    }
} else {
    Write-Host "   ⚠️  terminal-manager.ts not found (may be compiled)" -ForegroundColor Yellow
}

Write-Host ""

# ============================================================================
# SUMMARY
# ============================================================================
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📊 VERIFICATION SUMMARY" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Write-Host "✅ PASSED: $($passed.Count) checks" -ForegroundColor Green
$passed | ForEach-Object { Write-Host "   - $_" -ForegroundColor Gray }

Write-Host ""
Write-Host "❌ ISSUES: $($issues.Count) problems found" -ForegroundColor $(if ($issues.Count -eq 0) { "Green" } else { "Red" })
if ($issues.Count -gt 0) {
    $issues | ForEach-Object { Write-Host "   - $_" -ForegroundColor Red }
} else {
    Write-Host "   - None! Everything is correct." -ForegroundColor Green
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan

if ($issues.Count -eq 0) {
    Write-Host "✅ ALL CHECKS PASSED - Everything is correctly implemented!" -ForegroundColor Green
} else {
    Write-Host "❌ ISSUES FOUND - Fix the problems above" -ForegroundColor Red
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Copy missing files to VPS" -ForegroundColor White
    Write-Host "2. Start missing services" -ForegroundColor White
    Write-Host "3. Fix incorrect paths" -ForegroundColor White
}

Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
