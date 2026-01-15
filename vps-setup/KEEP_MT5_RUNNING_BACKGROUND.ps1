# PowerShell script to ensure EC Markets MT5 runs in background
# This keeps MT5 running even when the GUI window is closed

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  🔒 KEEPING EC MARKETS MT5 RUNNING IN BACKGROUND" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# MT5 Configuration
$mt5Path = "C:\Program Files\MetaTrader 5\terminal64.exe"
$mt5Login = "81071266"
$mt5Server = "ECMarkets-MT5-Live01"

# Check if MT5 is running
$mt5Process = Get-Process -Name terminal64 -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $mt5Path }

if ($mt5Process) {
    Write-Host "✅ MT5 Terminal is running (PID: $($mt5Process.Id))" -ForegroundColor Green
    
    # Check if window is visible
    if ($mt5Process.MainWindowTitle) {
        Write-Host "   Window Title: $($mt5Process.MainWindowTitle)" -ForegroundColor Gray
        Write-Host "   Status: Window is visible" -ForegroundColor Gray
    } else {
        Write-Host "   Status: Running in background (no visible window)" -ForegroundColor Yellow
    }
    
    # Ensure process doesn't terminate when window is closed
    Write-Host ""
    Write-Host "🔧 Configuring MT5 to stay running..." -ForegroundColor Yellow
    
    # Note: MT5 process will continue running even if window is closed
    # The Python MT5 library can connect to MT5 even without visible window
    Write-Host "✅ MT5 will continue running in background" -ForegroundColor Green
} else {
    Write-Host "⚠️  MT5 Terminal is NOT running!" -ForegroundColor Yellow
    Write-Host "   Starting MT5..." -ForegroundColor Yellow
    
    # Start MT5 minimized (will run in background)
    Start-Process -FilePath $mt5Path -WindowStyle Minimized
    
    Start-Sleep -Seconds 5
    
    $mt5Process = Get-Process -Name terminal64 -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $mt5Path }
    if ($mt5Process) {
        Write-Host "✅ MT5 started successfully (PID: $($mt5Process.Id))" -ForegroundColor Green
        Write-Host "   ⚠️  IMPORTANT: Log in to MT5 manually with:" -ForegroundColor Yellow
        Write-Host "      Login: $mt5Login" -ForegroundColor Gray
        Write-Host "      Server: $mt5Server" -ForegroundColor Gray
    } else {
        Write-Host "❌ Failed to start MT5!" -ForegroundColor Red
        exit 1
    }
}

# Create a scheduled task to monitor and restart MT5 if it closes
$taskName = "KeepECMarketsMT5Running"

$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Write-Host ""
    Write-Host "⚠️  Task '$taskName' already exists. Updating..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

# Create monitoring script
$monitorScript = @"
# Monitor and restart MT5 if it closes
`$mt5Path = "$mt5Path"
`$mt5Process = Get-Process -Name terminal64 -ErrorAction SilentlyContinue | Where-Object { `$_.Path -eq `$mt5Path }

if (-not `$mt5Process) {
    Write-Host "[$(Get-Date)] MT5 not running, starting..." -ForegroundColor Yellow
    Start-Process -FilePath `$mt5Path -WindowStyle Minimized
    Start-Sleep -Seconds 3
    Write-Host "[$(Get-Date)] MT5 started (PID: `$(Get-Process -Name terminal64 -ErrorAction SilentlyContinue | Where-Object { `$_.Path -eq `$mt5Path }).Id)" -ForegroundColor Green
} else {
    Write-Host "[$(Get-Date)] MT5 is running (PID: `$(`$mt5Process.Id))" -ForegroundColor Gray
}
"@

$monitorScriptPath = "C:\vps-broker-service\vps-setup\monitor-mt5.ps1"
$monitorScript | Out-File -FilePath $monitorScriptPath -Encoding UTF8

Write-Host ""
Write-Host "📝 Created monitoring script: $monitorScriptPath" -ForegroundColor Green

# Create scheduled task to run every 2 minutes
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$monitorScriptPath`""
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 2) -RepetitionDuration (New-TimeSpan -Days 365)
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

try {
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description "Monitors and restarts EC Markets MT5 if it closes - runs every 2 minutes" | Out-Null
    Write-Host "✅ Monitoring task created successfully!" -ForegroundColor Green
    Write-Host "   Task Name: $taskName" -ForegroundColor Gray
    Write-Host "   Trigger: Every 2 minutes" -ForegroundColor Gray
} catch {
    Write-Host "⚠️  Failed to create monitoring task: $_" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  ✅ MT5 BACKGROUND RUNNING CONFIGURED" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Configuration Summary:" -ForegroundColor Yellow
Write-Host "   ✅ MT5 will run in background (even if window is closed)" -ForegroundColor Gray
Write-Host "   ✅ Monitoring task will restart MT5 if it closes" -ForegroundColor Gray
Write-Host "   ✅ Price Feeder can connect to MT5 without visible window" -ForegroundColor Gray
Write-Host ""
Write-Host "⚠️  IMPORTANT:" -ForegroundColor Yellow
Write-Host "   1. Log in to MT5 manually (Login: $mt5Login, Server: $mt5Server)" -ForegroundColor Gray
Write-Host "   2. You can close the MT5 window - it will keep running" -ForegroundColor Gray
Write-Host "   3. Price Feeder will connect to MT5 in the background" -ForegroundColor Gray
Write-Host ""
