# Enable Algorithmic Trading in Generic MT5
# This script modifies the MT5 configuration to enable algorithmic trading by default

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "  ENABLING ALGORITHMIC TRADING IN GENERIC MT5" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host ""

$mt5Path = "C:\Program Files\MetaTrader 5"
$configPath = "$env:APPDATA\MetaQuotes\Terminal\*\config\common.ini"

Write-Host "Looking for MT5 configuration files..." -ForegroundColor Yellow

# Find all common.ini files (there might be multiple for different terminals)
$configFiles = Get-ChildItem -Path "$env:APPDATA\MetaQuotes\Terminal" -Recurse -Filter "common.ini" -ErrorAction SilentlyContinue

if ($configFiles.Count -eq 0) {
    Write-Host "⚠️  No MT5 configuration files found. MT5 may not have been run yet." -ForegroundColor Yellow
    Write-Host "💡 Starting Generic MT5 to create configuration..." -ForegroundColor Yellow
    Start-Process "$mt5Path\terminal64.exe"
    Start-Sleep -Seconds 5
    $configFiles = Get-ChildItem -Path "$env:APPDATA\MetaQuotes\Terminal" -Recurse -Filter "common.ini" -ErrorAction SilentlyContinue
}

if ($configFiles.Count -eq 0) {
    Write-Host "❌ Still no configuration files found. Please run Generic MT5 manually first." -ForegroundColor Red
    exit 1
}

Write-Host "Found $($configFiles.Count) configuration file(s)" -ForegroundColor Green
Write-Host ""

$updated = 0
foreach ($configFile in $configFiles) {
    Write-Host "Processing: $($configFile.FullName)" -ForegroundColor Cyan
    
    # Read current content
    $content = Get-Content $configFile.FullName -Raw -ErrorAction SilentlyContinue
    if (-not $content) {
        Write-Host "  ⚠️  Could not read file, skipping..." -ForegroundColor Yellow
        continue
    }
    
    # Check if [Common] section exists
    if ($content -notmatch '\[Common\]') {
        Write-Host "  ➕ Adding [Common] section..." -ForegroundColor Yellow
        $content = "[Common]`r`n" + $content
    }
    
    # Check if AllowDllImports exists and set it to 1
    if ($content -match 'AllowDllImports\s*=\s*(\d+)') {
        $currentValue = $matches[1]
        if ($currentValue -eq "1") {
            Write-Host "  ✅ AllowDllImports already enabled (value: $currentValue)" -ForegroundColor Green
        } else {
            Write-Host "  🔧 Enabling AllowDllImports (was: $currentValue)" -ForegroundColor Yellow
            $content = $content -replace 'AllowDllImports\s*=\s*\d+', 'AllowDllImports=1'
            $updated++
        }
    } else {
        Write-Host "  ➕ Adding AllowDllImports=1..." -ForegroundColor Yellow
        # Add after [Common] section
        $content = $content -replace '(\[Common\])', "`$1`r`nAllowDllImports=1"
        $updated++
    }
    
    # Check if AllowLiveTrading exists and set it to 1
    if ($content -match 'AllowLiveTrading\s*=\s*(\d+)') {
        $currentValue = $matches[1]
        if ($currentValue -eq "1") {
            Write-Host "  ✅ AllowLiveTrading already enabled (value: $currentValue)" -ForegroundColor Green
        } else {
            Write-Host "  🔧 Enabling AllowLiveTrading (was: $currentValue)" -ForegroundColor Yellow
            $content = $content -replace 'AllowLiveTrading\s*=\s*\d+', 'AllowLiveTrading=1'
            $updated++
        }
    } else {
        Write-Host "  ➕ Adding AllowLiveTrading=1..." -ForegroundColor Yellow
        # Add after [Common] section or AllowDllImports
        if ($content -match 'AllowDllImports') {
            $content = $content -replace '(AllowDllImports=\d+)', "`$1`r`nAllowLiveTrading=1"
        } else {
            $content = $content -replace '(\[Common\])', "`$1`r`nAllowLiveTrading=1"
        }
        $updated++
    }
    
    # Write back
    try {
        Set-Content -Path $configFile.FullName -Value $content -NoNewline -ErrorAction Stop
        Write-Host "  ✅ Configuration updated successfully" -ForegroundColor Green
    } catch {
        Write-Host "  ❌ Error updating file: $_" -ForegroundColor Red
    }
    Write-Host ""
}

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "  SUMMARY" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host ""

if ($updated -gt 0) {
    Write-Host "✅ Updated $updated configuration file(s)" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  IMPORTANT: You need to restart Generic MT5 for changes to take effect" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Close Generic MT5 if it's running" -ForegroundColor Gray
    Write-Host "  2. Restart Generic MT5" -ForegroundColor Gray
    Write-Host "  3. Verify 'Allow Algorithmic Trading' is checked in:" -ForegroundColor Gray
    Write-Host "     Tools → Options → Expert Advisors → Allow Algorithmic Trading" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "✅ All configurations already have algorithmic trading enabled" -ForegroundColor Green
    Write-Host ""
}

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host ""


