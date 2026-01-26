# ============================================================================
# DEPLOY MT5 BRIDGE FIX - Update to use C:\MT5_PriceFeeder
# ============================================================================

Write-Host ""
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "  DEPLOYING MT5 BRIDGE FIX" -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""

$MT5_BRIDGE_FILE = "C:\imperial-price-feeder\mt5_bridge.py"

# Check if file exists
if (-not (Test-Path $MT5_BRIDGE_FILE)) {
    Write-Host "  [ERROR] MT5 Bridge file not found: $MT5_BRIDGE_FILE" -ForegroundColor Red
    exit 1
}

# Backup original
$backupFile = "$MT5_BRIDGE_FILE.backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
Copy-Item $MT5_BRIDGE_FILE $backupFile
Write-Host "  [OK] Backup created: $backupFile" -ForegroundColor Green

# Read file
$content = Get-Content $MT5_BRIDGE_FILE -Raw

# Replace the initialization line - multiple patterns to catch
$patterns = @(
    @{
        Old = 'path=r"C:\\Program Files\\EC Markets MetaTrader 5\\terminal64\.exe", portable=False'
        New = 'path=r"C:\MT5_PriceFeeder\terminal64.exe", portable=True'
    },
    @{
        Old = 'path=r"C:\\\\Program Files\\\\EC Markets MetaTrader 5\\\\terminal64\.exe", portable=False'
        New = 'path=r"C:\MT5_PriceFeeder\terminal64.exe", portable=True'
    },
    @{
        Old = 'C:\\\\Program Files\\\\EC Markets MetaTrader 5\\\\terminal64\.exe.*portable=False'
        New = 'C:\MT5_PriceFeeder\terminal64.exe", portable=True'
    }
)

$updated = $false
foreach ($pattern in $patterns) {
    if ($content -match $pattern.Old) {
        $content = $content -replace $pattern.Old, $pattern.New
        $updated = $true
        break
    }
}

# Also update the error message
$content = $content -replace 'Make sure EC Markets MT5 Terminal is installed and accessible', 'Make sure EC Markets MT5 is copied to C:\MT5_PriceFeeder and accessible'

# Update comment
$content = $content -replace '# Initialize MT5 - Using EC Markets MT5 \(Standard Installation\)', '# Initialize MT5 - Using EC Markets MT5 in Portable Mode (C:\MT5_PriceFeeder)'

if ($updated) {
    # Save file
    $content | Set-Content $MT5_BRIDGE_FILE -Encoding UTF8
    Write-Host "  [OK] MT5 Bridge updated successfully" -ForegroundColor Green
    Write-Host "    Old: C:\Program Files\EC Markets MetaTrader 5\terminal64.exe, portable=False" -ForegroundColor Gray
    Write-Host "    New: C:\MT5_PriceFeeder\terminal64.exe, portable=True" -ForegroundColor Gray
} else {
    Write-Host "  [WARNING] Pattern not found - checking current configuration..." -ForegroundColor Yellow
    Get-Content $MT5_BRIDGE_FILE | Select-String -Pattern "mt5.initialize|portable" | ForEach-Object {
        Write-Host "    $_" -ForegroundColor Gray
    }
    
    # Try manual replacement
    $content = $content -replace 'C:\\Program Files\\EC Markets MetaTrader 5\\terminal64\.exe', 'C:\MT5_PriceFeeder\terminal64.exe'
    $content = $content -replace 'portable=False', 'portable=True'
    $content | Set-Content $MT5_BRIDGE_FILE -Encoding UTF8
    Write-Host "  [OK] Applied manual replacement" -ForegroundColor Green
}

Write-Host ""
Write-Host "Verifying update..." -ForegroundColor Yellow
Get-Content $MT5_BRIDGE_FILE | Select-String -Pattern "mt5.initialize" -Context 0,1 | ForEach-Object {
    Write-Host "    $_" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Verify setup: .\VERIFY_MT5_SETUP.ps1" -ForegroundColor White
Write-Host "  2. Restart Price Feeder: pm2 restart 'Imperial Price Feeder'" -ForegroundColor White
Write-Host "  3. Check logs: pm2 logs 'Imperial Price Feeder' --lines 30" -ForegroundColor White
Write-Host ""
