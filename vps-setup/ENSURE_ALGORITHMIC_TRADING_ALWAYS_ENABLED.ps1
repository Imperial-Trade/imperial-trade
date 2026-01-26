# Ensure Algorithmic Trading is Always Enabled
# This script runs on startup or periodically to ensure the setting stays enabled

Write-Host "Checking and enabling Algorithmic Trading in Generic MT5..." -ForegroundColor Cyan

$mt5Path = "C:\Program Files\MetaTrader 5\terminal64.exe"
$configPath = "$env:APPDATA\MetaQuotes\Terminal"

# Find Generic MT5 config (not EC Markets)
$configFiles = Get-ChildItem -Path $configPath -Recurse -Filter "common.ini" -ErrorAction SilentlyContinue | 
    Where-Object { $_.FullName -notlike '*EC Markets*' }

foreach ($configFile in $configFiles) {
    $content = Get-Content $configFile.FullName -Raw -ErrorAction SilentlyContinue
    if (-not $content) { continue }
    
    $needsUpdate = $false
    
    # Ensure [Common] section exists
    if ($content -notmatch '\[Common\]') {
        $content = "[Common]`r`n" + $content
        $needsUpdate = $true
    }
    
    # Ensure AllowDllImports=1
    if ($content -notmatch 'AllowDllImports\s*=\s*1') {
        if ($content -match 'AllowDllImports') {
            $content = $content -replace 'AllowDllImports\s*=\s*\d+', 'AllowDllImports=1'
        } else {
            $content = $content -replace '(\[Common\])', "`$1`r`nAllowDllImports=1"
        }
        $needsUpdate = $true
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
        $needsUpdate = $true
    }
    
    if ($needsUpdate) {
        try {
            Set-Content -Path $configFile.FullName -Value $content -NoNewline -ErrorAction Stop
            Write-Host "✅ Updated: $($configFile.FullName)" -ForegroundColor Green
        } catch {
            Write-Host "❌ Error updating: $($configFile.FullName)" -ForegroundColor Red
        }
    }
}

Write-Host "✅ Algorithmic Trading check complete" -ForegroundColor Green


