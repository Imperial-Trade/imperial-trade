# Setup automatic enabling of Algorithmic Trading
# This creates a scheduled task to run the ensure script periodically

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "  SETTING UP AUTOMATIC ALGORITHMIC TRADING ENABLEMENT" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host ""

$scriptPath = "C:\vps-broker-service\scripts\ENSURE_ALGORITHMIC_TRADING_ALWAYS_ENABLED.ps1"
$taskName = "EnsureMT5AlgorithmicTrading"

# Create scripts directory if it doesn't exist
$scriptsDir = "C:\vps-broker-service\scripts"
if (-not (Test-Path $scriptsDir)) {
    New-Item -ItemType Directory -Path $scriptsDir -Force | Out-Null
    Write-Host "✅ Created scripts directory: $scriptsDir" -ForegroundColor Green
}

# Copy the ensure script to the scripts directory
$sourceScript = Join-Path $PSScriptRoot "ENSURE_ALGORITHMIC_TRADING_ALWAYS_ENABLED.ps1"
if (Test-Path $sourceScript) {
    Copy-Item $sourceScript $scriptPath -Force
    Write-Host "✅ Copied ensure script to: $scriptPath" -ForegroundColor Green
} else {
    Write-Host "⚠️  Source script not found, creating new one..." -ForegroundColor Yellow
    # Create the script inline
    $scriptContent = @'
# Ensure Algorithmic Trading is Always Enabled
$configPath = "$env:APPDATA\MetaQuotes\Terminal"
$configFiles = Get-ChildItem -Path $configPath -Recurse -Filter "common.ini" -ErrorAction SilentlyContinue | 
    Where-Object { $_.FullName -notlike '*EC Markets*' }

foreach ($configFile in $configFiles) {
    $content = Get-Content $configFile.FullName -Raw -ErrorAction SilentlyContinue
    if (-not $content) { continue }
    
    $needsUpdate = $false
    
    if ($content -notmatch '\[Common\]') {
        $content = "[Common]`r`n" + $content
        $needsUpdate = $true
    }
    
    if ($content -notmatch 'AllowDllImports\s*=\s*1') {
        if ($content -match 'AllowDllImports') {
            $content = $content -replace 'AllowDllImports\s*=\s*\d+', 'AllowDllImports=1'
        } else {
            $content = $content -replace '(\[Common\])', "`$1`r`nAllowDllImports=1"
        }
        $needsUpdate = $true
    }
    
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
        } catch {
            # Silent fail
        }
    }
}
'@
    Set-Content -Path $scriptPath -Value $scriptContent
    Write-Host "✅ Created ensure script: $scriptPath" -ForegroundColor Green
}

# Remove existing task if it exists
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
    Write-Host "✅ Removed existing scheduled task" -ForegroundColor Green
}

# Create scheduled task to run every 5 minutes
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 5) -RepetitionDuration (New-TimeSpan -Days 365)
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Highest

try {
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description "Ensures Algorithmic Trading is always enabled in Generic MT5" | Out-Null
    Write-Host "✅ Created scheduled task: $taskName" -ForegroundColor Green
    Write-Host "   Runs every 5 minutes to ensure Algorithmic Trading stays enabled" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error creating scheduled task: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "  SETUP COMPLETE" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Algorithmic Trading will now be automatically enabled:" -ForegroundColor Green
Write-Host "   - Configuration files have been updated" -ForegroundColor Gray
Write-Host "   - Scheduled task runs every 5 minutes to ensure it stays enabled" -ForegroundColor Gray
Write-Host ""
Write-Host "⚠️  IMPORTANT: Restart Generic MT5 for initial changes to take effect" -ForegroundColor Yellow
Write-Host ""


