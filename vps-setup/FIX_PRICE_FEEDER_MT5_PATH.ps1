# ============================================================================
# FIX PRICE FEEDER MT5 PATH - Use C:\MT5_PriceFeeder (Portable)
# ============================================================================

Write-Host ""
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "  FIXING PRICE FEEDER TO USE C:\MT5_PriceFeeder (Portable)" -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""

$PRICE_FEEDER_DIR = "C:\imperial-price-feeder"
$PYTHON_SCRIPT = "$PRICE_FEEDER_DIR\python\mt5_price_reader.py"

# Check if file exists
if (-not (Test-Path $PYTHON_SCRIPT)) {
    Write-Host "  [ERROR] mt5_price_reader.py not found: $PYTHON_SCRIPT" -ForegroundColor Red
    exit 1
}

# Backup original
$backupFile = "$PYTHON_SCRIPT.backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
Copy-Item $PYTHON_SCRIPT $backupFile
Write-Host "  [OK] Backup created: $backupFile" -ForegroundColor Green

# Read file
$content = Get-Content $PYTHON_SCRIPT -Raw

# Check current state
$needsFix = $false
if ($content -match "mt5\.initialize\(\)") {
    Write-Host "  [INFO] Current: Uses default MT5 (needs fix)" -ForegroundColor Yellow
    $needsFix = $true
} elseif ($content -match "mt5\.initialize\(.*path\s*=\s*r?[\"']C:\\MT5_PriceFeeder") {
    Write-Host "  [INFO] Current: Already uses C:\MT5_PriceFeeder" -ForegroundColor Green
    if ($content -match "portable\s*=\s*True") {
        Write-Host "  [OK] Already configured correctly!" -ForegroundColor Green
        Write-Host ""
        Write-Host "No changes needed - script is already correct." -ForegroundColor Cyan
        exit 0
    } else {
        Write-Host "  [INFO] Uses correct path but missing portable=True" -ForegroundColor Yellow
        $needsFix = $true
    }
} else {
    Write-Host "  [WARNING] Could not determine current state" -ForegroundColor Yellow
    $needsFix = $true
}

if ($needsFix) {
    # Replace mt5.initialize() without path
    $oldPattern = 'if not mt5\.initialize\(\):'
    $newCode = 'if not mt5.initialize(path=r"C:\MT5_PriceFeeder\terminal64.exe", portable=True):'
    
    if ($content -match $oldPattern) {
        $content = $content -replace $oldPattern, $newCode
        Write-Host "  [OK] Updated mt5.initialize() call" -ForegroundColor Green
    }
    
    # Update comment before initialize
    if (-not ($content -match "CRITICAL.*MT5_BrokerService")) {
        $content = $content -replace '(    # Initialize MT5 connection)', '$1 - Using MT5_PriceFeeder (Portable Mode) - CRITICAL: Use explicit path to avoid conflicts with MT5_BrokerService'
        Write-Host "  [OK] Updated comment" -ForegroundColor Green
    }
    
    # Update error message to include path
    $content = $content -replace '("error": "MT5 initialization failed: \{error\}")', '$1,"mt5_path": "C:\\MT5_PriceFeeder\\terminal64.exe","portable": True'
    $content = $content -replace '("error": "Failed to get account info. Is MT5 terminal running and logged in\?")', '$1,"mt5_path": "C:\\MT5_PriceFeeder\\terminal64.exe","portable": True'
    Write-Host "  [OK] Updated error messages" -ForegroundColor Green
    
    # Save file
    $content | Set-Content $PYTHON_SCRIPT -Encoding UTF8
    Write-Host ""
    Write-Host "  [OK] mt5_price_reader.py updated successfully" -ForegroundColor Green
    Write-Host "    Changed: mt5.initialize() → mt5.initialize(path='C:\MT5_PriceFeeder\terminal64.exe', portable=True)" -ForegroundColor Gray
} else {
    Write-Host "  [OK] No changes needed - already correct" -ForegroundColor Green
}

Write-Host ""
Write-Host "Verifying update..." -ForegroundColor Yellow
Get-Content $PYTHON_SCRIPT | Select-String -Pattern "mt5.initialize" -Context 0,1 | ForEach-Object {
    Write-Host "    $_" -ForegroundColor Gray
}

Write-Host ""
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "  FIX COMPLETE" -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Restart Price Feeder: pm2 restart 'Imperial Price Feeder'" -ForegroundColor White
Write-Host "  2. Check logs: pm2 logs 'Imperial Price Feeder' --lines 30" -ForegroundColor White
Write-Host "  3. Verify: .\VERIFY_MT5_ISOLATION.ps1" -ForegroundColor White
Write-Host ""
