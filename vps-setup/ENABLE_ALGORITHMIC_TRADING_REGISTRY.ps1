# Enable Algorithmic Trading via MT5 Registry Settings
# MT5 stores UI settings in Windows Registry

Write-Host "=== ENABLING ALGORITHMIC TRADING VIA REGISTRY ===" -ForegroundColor Cyan
Write-Host ""

# MT5 stores settings in registry under HKEY_CURRENT_USER
$registryPath = "HKCU:\Software\MetaQuotes\Terminal"

Write-Host "Searching for MT5 registry keys..." -ForegroundColor Yellow

# Find all MT5 terminal registry keys
$terminalKeys = Get-ChildItem -Path $registryPath -ErrorAction SilentlyContinue | Where-Object {
    $_.PSChildName -match '^[A-F0-9]{32}$'  # MT5 uses 32-char hex IDs
}

if (-not $terminalKeys) {
    Write-Host "No MT5 terminal registry keys found" -ForegroundColor Red
    Write-Host "   This usually means MT5 has not been run yet on this user account" -ForegroundColor Yellow
    Write-Host "   Please run Generic MT5 at least once, then run this script again" -ForegroundColor Yellow
    exit 1
}

Write-Host "Found $($terminalKeys.Count) MT5 terminal(s)" -ForegroundColor Green
Write-Host ""

foreach ($terminalKey in $terminalKeys) {
    $terminalId = $terminalKey.PSChildName
    Write-Host "Processing terminal: $terminalId" -ForegroundColor Yellow
    
    # Navigate to the terminal's config
    $configPath = "$($terminalKey.PSPath)\config"
    
    if (-not (Test-Path $configPath)) {
        Write-Host "  Config path not found, skipping..." -ForegroundColor Yellow
        continue
    }
    
    # Try to set ExpertAdvisors settings
    # Note: The exact registry key name may vary, but we'll try common locations
    $expertPath = "$configPath\ExpertAdvisors"
    
    if (-not (Test-Path $expertPath)) {
        Write-Host "  Creating ExpertAdvisors registry key..." -ForegroundColor Yellow
        New-Item -Path $expertPath -Force | Out-Null
    }
    
    # Set AllowAlgorithmicTrading (if this key exists)
    try {
        Set-ItemProperty -Path $expertPath -Name "AllowAlgorithmicTrading" -Value 1 -Type DWord -ErrorAction SilentlyContinue
        Write-Host "  Set AllowAlgorithmicTrading=1" -ForegroundColor Green
    } catch {
        Write-Host "  Could not set AllowAlgorithmicTrading (key may not exist)" -ForegroundColor Yellow
    }
    
    # Also try common.ini file modification (more reliable)
    $commonIniPath = Join-Path $terminalKey.PSPath "config\common.ini"
    $appDataPath = "$env:APPDATA\MetaQuotes\Terminal\$terminalId\config\common.ini"
    
    if (Test-Path $appDataPath) {
        Write-Host "  Updating common.ini file..." -ForegroundColor Yellow
        $content = Get-Content $appDataPath -Raw
        
        # Ensure AllowDllImports=1
        if ($content -notmatch 'AllowDllImports\s*=\s*1') {
            if ($content -match 'AllowDllImports') {
                $content = $content -replace 'AllowDllImports\s*=\s*\d+', 'AllowDllImports=1'
            } else {
                $content = $content -replace '(\[Common\])', "`$1`r`nAllowDllImports=1"
            }
            Write-Host "    Set AllowDllImports=1" -ForegroundColor Green
        }
        
        # Ensure AllowLiveTrading=1
        if ($content -notmatch 'AllowLiveTrading\s*=\s*1') {
            if ($content -match 'AllowLiveTrading') {
                $content = $content -replace 'AllowLiveTrading\s*=\s*\d+', 'AllowLiveTrading=1'
            } else {
                if ($content -match 'AllowDllImports') {
                    $content = $content -replace '(AllowDllImports=\d+)', "`$1`r`nAllowLiveTrading=1"
                } else {
                    $content = $content -replace '(\[Common\])', "`$1`r`nAllowLiveTrading=1"
                }
            }
            Write-Host "    Set AllowLiveTrading=1" -ForegroundColor Green
        }
        
        # Save the file
        Set-Content -Path $appDataPath -Value $content -NoNewline
        Write-Host "    Saved common.ini" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "=== COMPLETE ===" -ForegroundColor Green
Write-Host ""
Write-Host "IMPORTANT: You may need to:" -ForegroundColor Yellow
Write-Host "1. Restart Generic MT5 for changes to take effect" -ForegroundColor White
Write-Host "2. Manually verify: Tools -> Options -> Expert Advisors -> Allow Algorithmic Trading" -ForegroundColor White
Write-Host "3. If still not enabled, manually enable it once in MT5 UI" -ForegroundColor White
Write-Host ""
