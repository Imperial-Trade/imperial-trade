# Monitor MT5 Process and Auto-Enable Algorithmic Trading When It Starts
# This script runs in the background and automatically enables the setting when MT5 starts

Write-Host "=== MT5 ALGORITHMIC TRADING AUTO-ENABLER ===" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "⚠️  WARNING: Not running as Administrator" -ForegroundColor Yellow
    Write-Host "   Some operations may require admin privileges" -ForegroundColor Yellow
    Write-Host ""
}

# Function to enable algorithmic trading via common.ini
function Enable-AlgorithmicTradingInConfig {
    $configPath = "$env:APPDATA\MetaQuotes\Terminal"
    $configFiles = Get-ChildItem -Path $configPath -Recurse -Filter "common.ini" -ErrorAction SilentlyContinue
    
    if (-not $configFiles) {
        return $false
    }
    
    $modified = $false
    foreach ($file in $configFiles) {
        $content = Get-Content $file.FullName -Raw
        
        # Ensure AllowDllImports=1
        if ($content -notmatch 'AllowDllImports\s*=\s*1') {
            if ($content -match 'AllowDllImports') {
                $content = $content -replace 'AllowDllImports\s*=\s*\d+', 'AllowDllImports=1'
            } else {
                $content = $content -replace '(\[Common\])', "`$1`r`nAllowDllImports=1"
            }
            $modified = $true
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
            $modified = $true
        }
        
        if ($modified) {
            Set-Content -Path $file.FullName -Value $content -NoNewline
            Write-Host "✅ Updated: $($file.FullName)" -ForegroundColor Green
        }
    }
    
    return $modified
}

# Function to check if MT5 is running
function Test-MT5Running {
    $mt5Processes = Get-Process | Where-Object { $_.ProcessName -like '*terminal*' }
    return ($mt5Processes.Count -gt 0)
}

Write-Host "Starting MT5 monitor..." -ForegroundColor Yellow
Write-Host "This script will check every 10 seconds and enable algorithmic trading when MT5 starts" -ForegroundColor Gray
Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""

$lastMT5State = $false

while ($true) {
    $mt5Running = Test-MT5Running
    
    if ($mt5Running -and -not $lastMT5State) {
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] MT5 detected! Enabling algorithmic trading..." -ForegroundColor Green
        
        # Wait a moment for MT5 to fully initialize
        Start-Sleep -Seconds 3
        
        # Enable in config files
        $enabled = Enable-AlgorithmicTradingInConfig
        
        if ($enabled) {
            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] ✅ Algorithmic trading enabled in config files" -ForegroundColor Green
            Write-Host "   Note: You may still need to enable it in MT5 UI manually" -ForegroundColor Yellow
        } else {
            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] ⚠️  Config files already set, but UI checkbox may still need manual enable" -ForegroundColor Yellow
        }
    } elseif (-not $mt5Running -and $lastMT5State) {
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] MT5 stopped" -ForegroundColor Gray
    }
    
    $lastMT5State = $mt5Running
    Start-Sleep -Seconds 10
}


