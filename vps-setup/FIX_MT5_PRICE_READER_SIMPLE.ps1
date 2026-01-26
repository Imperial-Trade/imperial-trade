# ============================================================================
# FIX MT5 PRICE READER - Simple Version
# ============================================================================

Write-Host ""
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "  FIXING mt5_price_reader.py TO USE C:\MT5_PriceFeeder (Portable)" -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""

# Find the script
$scriptPath = "C:\imperial-price-feeder\python\mt5_price_reader.py"
if (-not (Test-Path $scriptPath)) {
    $scriptPath = "C:\imperial-price-feeder\mt5_price_reader.py"
}

if (-not (Test-Path $scriptPath)) {
    Write-Host "  [ERROR] mt5_price_reader.py not found" -ForegroundColor Red
    Write-Host "    Checked: C:\imperial-price-feeder\python\mt5_price_reader.py" -ForegroundColor Yellow
    Write-Host "    Checked: C:\imperial-price-feeder\mt5_price_reader.py" -ForegroundColor Yellow
    exit 1
}

Write-Host "  [OK] Found: $scriptPath" -ForegroundColor Green

# Backup
$backupPath = "$scriptPath.backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
Copy-Item $scriptPath $backupPath
Write-Host "  [OK] Backup created: $backupPath" -ForegroundColor Green

# Read file
$content = Get-Content $scriptPath -Raw

# Check if already fixed
if ($content -match "C:\\MT5_PriceFeeder\\terminal64.exe" -and $content -match "portable=True") {
    Write-Host "  [OK] Already configured correctly!" -ForegroundColor Green
    Write-Host "    No changes needed." -ForegroundColor Gray
    exit 0
}

# Fix: Replace mt5.initialize() without path
$oldCode = "if not mt5.initialize():"
$newCode = @'
if not mt5.initialize(path=r"C:\MT5_PriceFeeder\terminal64.exe", portable=True):
'@

if ($content -match $oldCode) {
    $content = $content -replace [regex]::Escape($oldCode), $newCode
    Write-Host "  [OK] Updated mt5.initialize() call" -ForegroundColor Green
} else {
    Write-Host "  [WARNING] Could not find mt5.initialize() call to replace" -ForegroundColor Yellow
}

# Update comment
$oldComment = "# Initialize MT5 connection"
$newComment = "# Initialize MT5 connection - Using MT5_PriceFeeder (Portable Mode)"
if ($content -match $oldComment) {
    $content = $content -replace [regex]::Escape($oldComment), $newComment
    Write-Host "  [OK] Updated comment" -ForegroundColor Green
}

# Update error messages
$error1Old = '"error": f"MT5 initialization failed: {error}",'
$error1New = '"error": f"MT5 initialization failed: {error}", "mt5_path": "C:\\MT5_PriceFeeder\\terminal64.exe", "portable": True,'

if ($content -match [regex]::Escape($error1Old)) {
    $content = $content -replace ([regex]::Escape($error1Old)), $error1New
    Write-Host "  [OK] Updated error message 1" -ForegroundColor Green
}

$error2Old = '"error": "Failed to get account info. Is MT5 terminal running and logged in?"'
$error2New = '"error": "Failed to get account info. Is MT5 terminal running and logged in?", "mt5_path": "C:\\MT5_PriceFeeder\\terminal64.exe", "portable": True'

if ($content -match [regex]::Escape($error2Old)) {
    $content = $content -replace ([regex]::Escape($error2Old)), $error2New
    Write-Host "  [OK] Updated error message 2" -ForegroundColor Green
}

# Save file
$content | Set-Content $scriptPath -Encoding UTF8
Write-Host ""
Write-Host "  [OK] File updated successfully!" -ForegroundColor Green

# Verify
Write-Host ""
Write-Host "Verification:" -ForegroundColor Yellow
Get-Content $scriptPath | Select-String -Pattern "mt5.initialize" -Context 0,1 | ForEach-Object {
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
Write-Host "  3. Verify: .\VERIFY_MT5_ISOLATION_COMPLETE.ps1" -ForegroundColor White
Write-Host ""
