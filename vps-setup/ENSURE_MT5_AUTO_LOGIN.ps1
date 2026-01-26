# ============================================================================
# ENSURE MT5 AUTO-LOGIN IS ENABLED FOR PRICE FEEDER
# ============================================================================
# Makes sure EC Markets MT5 can auto-login when restarted
# This ensures Price Feeder can reconnect immediately after MT5 restart
# ============================================================================

Write-Host ""
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "  ENSURING MT5 AUTO-LOGIN FOR PRICE FEEDER" -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""

$MT5_PATH = "C:\MT5_PriceFeeder\terminal64.exe"
$MT5_CONFIG_PATH = "C:\MT5_PriceFeeder\config\common.ini"

# ============================================================================
# STEP 1: Verify MT5 exists
# ============================================================================
Write-Host "STEP 1: Verifying MT5 installation..." -ForegroundColor Yellow

if (-not (Test-Path $MT5_PATH)) {
    Write-Host "  [ERROR] MT5 NOT FOUND at: $MT5_PATH" -ForegroundColor Red
    exit 1
}

Write-Host "  [OK] MT5 found: $MT5_PATH" -ForegroundColor Green
Write-Host ""

# ============================================================================
# STEP 2: Check/Update MT5 config for auto-login
# ============================================================================
Write-Host "STEP 2: Checking MT5 auto-login configuration..." -ForegroundColor Yellow

if (Test-Path $MT5_CONFIG_PATH) {
    $config = Get-Content $MT5_CONFIG_PATH -Raw
    
    # Check if Login is set
    if ($config -match 'Login\s*=\s*81071266') {
        Write-Host "  [OK] Auto-login account configured: 81071266" -ForegroundColor Green
    } else {
        Write-Host "  [INFO] Adding auto-login configuration..." -ForegroundColor Yellow
        
        # Add or update Login setting
        if ($config -match '\[Common\]') {
            $config = $config -replace '\[Common\]', "[Common]`nLogin=81071266"
        } else {
            $config = "[Common]`nLogin=81071266`n`n$config"
        }
        
        $config | Set-Content $MT5_CONFIG_PATH -NoNewline
        Write-Host "  [OK] Auto-login configured" -ForegroundColor Green
    }
    
    # Check if Password is saved
    if ($config -match 'Password\s*=') {
        Write-Host "  [OK] Password is saved in config" -ForegroundColor Green
    } else {
        Write-Host "  [WARN] Password not found in config" -ForegroundColor Yellow
        Write-Host "         You may need to log in once manually to save password" -ForegroundColor Gray
    }
} else {
    Write-Host "  [INFO] Config file not found, creating..." -ForegroundColor Yellow
    
    $configContent = @"
[Common]
Login=81071266
"@
    
    $configDir = Split-Path $MT5_CONFIG_PATH
    if (-not (Test-Path $configDir)) {
        New-Item -ItemType Directory -Path $configDir -Force | Out-Null
    }
    
    $configContent | Set-Content $MT5_CONFIG_PATH
    Write-Host "  [OK] Config file created with auto-login" -ForegroundColor Green
}

Write-Host ""

# ============================================================================
# STEP 3: Verify MT5 can auto-login
# ============================================================================
Write-Host "STEP 3: Important Notes..." -ForegroundColor Yellow
Write-Host ""
Write-Host "  For auto-login to work:" -ForegroundColor Cyan
Write-Host "  1. Log in to EC Markets MT5 manually ONCE" -ForegroundColor White
Write-Host "  2. Check 'Save password' or 'Remember password' checkbox" -ForegroundColor White
Write-Host "  3. MT5 will save credentials in its config" -ForegroundColor White
Write-Host "  4. After that, MT5 will auto-login on restart" -ForegroundColor White
Write-Host ""
Write-Host "  Account: 81071266" -ForegroundColor Gray
Write-Host "  Server: ECMarkets-MT5-Live01" -ForegroundColor Gray
Write-Host ""

# ============================================================================
# FINAL SUMMARY
# ============================================================================
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "  CONFIGURATION COMPLETE!" -ForegroundColor Green
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Open EC Markets MT5: C:\MT5_PriceFeeder\terminal64.exe" -ForegroundColor White
Write-Host "  2. Log in with account 81071266" -ForegroundColor White
Write-Host "  3. Check 'Save password' checkbox" -ForegroundColor White
Write-Host "  4. Close and reopen MT5 to verify auto-login works" -ForegroundColor White
Write-Host ""
