# ============================================================================
# VERIFY MT5 SETUP - Complete Verification
# ============================================================================

Write-Host ""
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "  VERIFYING MT5 PRICE FEEDER SETUP" -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""

$PRICE_FEEDER_DIR = "C:\MT5_PriceFeeder"
$EC_MARKETS_SOURCE = "C:\Program Files\EC Markets MetaTrader 5"
$allGood = $true

# Check 1: Directory exists
Write-Host "1. Checking C:\MT5_PriceFeeder directory..." -ForegroundColor Yellow
if (Test-Path $PRICE_FEEDER_DIR) {
    Write-Host "  [OK] Directory exists" -ForegroundColor Green
} else {
    Write-Host "  [ERROR] Directory does not exist" -ForegroundColor Red
    $allGood = $false
}

# Check 2: terminal64.exe exists
Write-Host "2. Checking terminal64.exe..." -ForegroundColor Yellow
if (Test-Path "$PRICE_FEEDER_DIR\terminal64.exe") {
    $fileInfo = Get-Item "$PRICE_FEEDER_DIR\terminal64.exe"
    Write-Host "  [OK] terminal64.exe found" -ForegroundColor Green
    Write-Host "    Size: $([math]::Round($fileInfo.Length / 1MB, 2)) MB" -ForegroundColor Gray
    Write-Host "    Modified: $($fileInfo.LastWriteTime)" -ForegroundColor Gray
} else {
    Write-Host "  [ERROR] terminal64.exe not found" -ForegroundColor Red
    $allGood = $false
}

# Check 3: Verify it's EC Markets MT5 (check for EC Markets specific files)
Write-Host "3. Verifying EC Markets MT5 files..." -ForegroundColor Yellow
$ecMarketsFiles = @(
    "$PRICE_FEEDER_DIR\terminal64.exe",
    "$PRICE_FEEDER_DIR\MetaTrader 5.exe"
)

foreach ($file in $ecMarketsFiles) {
    if (Test-Path $file) {
        Write-Host "  [OK] Found: $(Split-Path $file -Leaf)" -ForegroundColor Green
    } else {
        Write-Host "  [WARNING] Missing: $(Split-Path $file -Leaf)" -ForegroundColor Yellow
    }
}

# Check 4: MT5 Bridge configuration
Write-Host "4. Checking MT5 Bridge configuration..." -ForegroundColor Yellow
$bridgeFile = "C:\imperial-price-feeder\mt5_bridge.py"
if (Test-Path $bridgeFile) {
    $content = Get-Content $bridgeFile -Raw
    if ($content -match "C:\\MT5_PriceFeeder\\terminal64.exe" -and $content -match "portable=True") {
        Write-Host "  [OK] MT5 Bridge configured correctly" -ForegroundColor Green
        Write-Host "    Path: C:\MT5_PriceFeeder\terminal64.exe" -ForegroundColor Gray
        Write-Host "    Portable: True" -ForegroundColor Gray
    } else {
        Write-Host "  [ERROR] MT5 Bridge not configured correctly" -ForegroundColor Red
        Write-Host "    Expected: C:\MT5_PriceFeeder\terminal64.exe, portable=True" -ForegroundColor Yellow
        $allGood = $false
    }
} else {
    Write-Host "  [WARNING] MT5 Bridge file not found" -ForegroundColor Yellow
    $allGood = $false
}

# Check 5: Watchdog configuration
Write-Host "5. Checking Watchdog configuration..." -ForegroundColor Yellow
$watchdogFile = "C:\imperial-price-feeder\watchdogs\price-feeder-watchdog-advanced.js"
if (Test-Path $watchdogFile) {
    $content = Get-Content $watchdogFile -Raw
    if ($content -match "C:\\\\MT5_PriceFeeder\\\\terminal64.exe") {
        Write-Host "  [OK] Watchdog configured correctly" -ForegroundColor Green
        Write-Host "    Path: C:\MT5_PriceFeeder\terminal64.exe" -ForegroundColor Gray
    } else {
        Write-Host "  [WARNING] Watchdog path may be incorrect" -ForegroundColor Yellow
    }
} else {
    Write-Host "  [WARNING] Watchdog file not found" -ForegroundColor Yellow
}

# Check 6: Running MT5 processes
Write-Host "6. Checking running MT5 processes..." -ForegroundColor Yellow
$mt5Processes = Get-Process terminal64 -ErrorAction SilentlyContinue
if ($mt5Processes) {
    foreach ($proc in $mt5Processes) {
        try {
            $wmi = Get-WmiObject Win32_Process -Filter "ProcessId = $($proc.Id)" -ErrorAction SilentlyContinue
            $path = $wmi.CommandLine
            if ($path -like "*MT5_PriceFeeder*") {
                Write-Host "  [OK] MT5 Price Feeder running (PID: $($proc.Id))" -ForegroundColor Green
                Write-Host "    Path: $path" -ForegroundColor Gray
            } elseif ($path -like "*EC Markets*") {
                Write-Host "  [INFO] EC Markets MT5 running (PID: $($proc.Id))" -ForegroundColor Cyan
                Write-Host "    Path: $path" -ForegroundColor Gray
            } else {
                Write-Host "  [INFO] Other MT5 running (PID: $($proc.Id))" -ForegroundColor Gray
            }
        } catch {
            Write-Host "  [INFO] MT5 process running (PID: $($proc.Id)) - cannot read path" -ForegroundColor Gray
        }
    }
} else {
    Write-Host "  [INFO] No MT5 processes running" -ForegroundColor Gray
}

# Check 7: Price Feeder service
Write-Host "7. Checking Price Feeder service..." -ForegroundColor Yellow
$pm2Status = pm2 status 2>&1 | Out-String
if ($pm2Status -match "Imperial Price Feeder") {
    Write-Host "  [OK] Price Feeder service found in PM2" -ForegroundColor Green
    pm2 status | Select-String "Price Feeder" | ForEach-Object {
        Write-Host "    $_" -ForegroundColor Gray
    }
} else {
    Write-Host "  [WARNING] Price Feeder service not found in PM2" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "===============================================================================" -ForegroundColor Cyan
if ($allGood) {
    Write-Host "  VERIFICATION COMPLETE - ALL CHECKS PASSED" -ForegroundColor Green
} else {
    Write-Host "  VERIFICATION COMPLETE - SOME ISSUES FOUND" -ForegroundColor Yellow
}
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""
