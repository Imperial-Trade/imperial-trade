# ============================================================================
# SETUP MT5 AS WINDOWS SERVICE FOR 24/7 OPERATION
# ============================================================================
# Creates Windows Task Scheduler task to auto-start MT5 on boot and keep it running
# This ensures MT5 starts even if manually closed
# ============================================================================

Write-Host ""
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "  SETTING UP MT5 AS WINDOWS SERVICE (24/7 OPERATION)" -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""

$MT5_PATH = "C:\MT5_PriceFeeder\terminal64.exe"
$MT5_DATA_PATH = "C:\MT5_PriceFeeder"
$TASK_NAME = "MT5_PriceFeeder_AutoStart"
$SCRIPT_PATH = "C:\imperial-price-feeder\scripts\start-mt5.ps1"

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
# STEP 2: Create startup script
# ============================================================================
Write-Host "STEP 2: Creating MT5 startup script..." -ForegroundColor Yellow

$scriptDir = Split-Path $SCRIPT_PATH
if (-not (Test-Path $scriptDir)) {
    New-Item -ItemType Directory -Path $scriptDir -Force | Out-Null
}

$scriptContent = @"
# MT5 Price Feeder Auto-Start Script
# This script starts MT5 in portable mode with auto-login

`$MT5_PATH = "$MT5_PATH"
`$MT5_DATA_PATH = "$MT5_DATA_PATH"

# Check if MT5 is already running
`$mt5Process = Get-Process terminal64 -ErrorAction SilentlyContinue | Where-Object { `$_.Path -like '*MT5_PriceFeeder*' }

if (`$mt5Process) {
    Write-Host "MT5 is already running (PID: `$(`$mt5Process.Id))"
    exit 0
}

# Start MT5 in portable mode
Write-Host "Starting MT5 Price Feeder..."
Start-Process -FilePath `$MT5_PATH -ArgumentList "/portable" -WindowStyle Normal

# Wait for MT5 to initialize
Start-Sleep -Seconds 10

# Verify MT5 started
`$mt5Process = Get-Process terminal64 -ErrorAction SilentlyContinue | Where-Object { `$_.Path -like '*MT5_PriceFeeder*' }

if (`$mt5Process) {
    Write-Host "MT5 started successfully (PID: `$(`$mt5Process.Id))"
    exit 0
} else {
    Write-Host "MT5 failed to start"
    exit 1
}
"@

$scriptContent | Set-Content -Path $SCRIPT_PATH -Encoding UTF8

Write-Host "  [OK] Startup script created: $SCRIPT_PATH" -ForegroundColor Green
Write-Host ""

# ============================================================================
# STEP 3: Create Windows Task Scheduler task
# ============================================================================
Write-Host "STEP 3: Creating Windows Task Scheduler task..." -ForegroundColor Yellow

# Delete existing task if it exists
$existingTask = Get-ScheduledTask -TaskName $TASK_NAME -ErrorAction SilentlyContinue
if ($existingTask) {
    Unregister-ScheduledTask -TaskName $TASK_NAME -Confirm:$false
    Write-Host "  [INFO] Removed existing task" -ForegroundColor Gray
}

# Create action (run PowerShell script)
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -File `"$SCRIPT_PATH`""

# Create trigger (on system startup)
$trigger = New-ScheduledTaskTrigger -AtStartup

# Create principal (run as current user with highest privileges)
# Use SYSTEM account for reliability (works even if user changes)
try {
    $principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Highest
} catch {
    # Fallback to SYSTEM account if user account fails
    Write-Host "  [INFO] Using SYSTEM account for task (more reliable)" -ForegroundColor Gray
    $principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
}

# Create settings (allow task to run on demand, restart on failure)
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)

# Register the task
try {
    Register-ScheduledTask -TaskName $TASK_NAME -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description "Auto-start MT5 Price Feeder on system boot and keep it running" | Out-Null
    Write-Host "  [OK] Task Scheduler task created: $TASK_NAME" -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] Failed to create task: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# ============================================================================
# STEP 4: Create monitoring task (runs every 5 minutes to ensure MT5 is running)
# ============================================================================
Write-Host "STEP 4: Creating MT5 monitoring task..." -ForegroundColor Yellow

$MONITOR_TASK_NAME = "MT5_PriceFeeder_Monitor"
$monitorScriptPath = "C:\imperial-price-feeder\scripts\monitor-mt5.ps1"

$monitorScriptContent = @"
# MT5 Price Feeder Monitor Script
# Checks if MT5 is running and starts it if not

`$MT5_PATH = "$MT5_PATH"
`$START_SCRIPT = "$SCRIPT_PATH"

`$mt5Process = Get-Process terminal64 -ErrorAction SilentlyContinue | Where-Object { `$_.Path -like '*MT5_PriceFeeder*' }

if (-not `$mt5Process) {
    Write-Host "MT5 not running, starting..."
    & `$START_SCRIPT
} else {
    Write-Host "MT5 is running (PID: `$(`$mt5Process.Id))"
}
"@

$monitorScriptContent | Set-Content -Path $monitorScriptPath -Encoding UTF8

# Create monitoring task (runs every 5 minutes)
$monitorAction = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -File `"$monitorScriptPath`""
$monitorTrigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 5) -RepetitionDuration (New-TimeSpan -Days 365)
$monitorSettings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

$existingMonitorTask = Get-ScheduledTask -TaskName $MONITOR_TASK_NAME -ErrorAction SilentlyContinue
if ($existingMonitorTask) {
    Unregister-ScheduledTask -TaskName $MONITOR_TASK_NAME -Confirm:$false
}

try {
    Register-ScheduledTask -TaskName $MONITOR_TASK_NAME -Action $monitorAction -Trigger $monitorTrigger -Principal $principal -Settings $monitorSettings -Description "Monitor MT5 Price Feeder every 5 minutes and restart if closed" | Out-Null
    Write-Host "  [OK] Monitoring task created: $MONITOR_TASK_NAME" -ForegroundColor Green
} catch {
    Write-Host "  [WARN] Failed to create monitoring task: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""

# ============================================================================
# STEP 5: Test the setup
# ============================================================================
Write-Host "STEP 5: Testing MT5 startup..." -ForegroundColor Yellow

& $SCRIPT_PATH

Start-Sleep -Seconds 5

$mt5Process = Get-Process terminal64 -ErrorAction SilentlyContinue | Where-Object { $_.Path -like '*MT5_PriceFeeder*' }

if ($mt5Process) {
    Write-Host "  [OK] MT5 started successfully (PID: $($mt5Process.Id))" -ForegroundColor Green
} else {
    Write-Host "  [WARN] MT5 may need manual start to verify auto-login" -ForegroundColor Yellow
}

Write-Host ""

# ============================================================================
# FINAL SUMMARY
# ============================================================================
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "  SETUP COMPLETE!" -ForegroundColor Green
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Windows Tasks Created:" -ForegroundColor Yellow
Write-Host "  ├── $TASK_NAME (Starts MT5 on system boot)" -ForegroundColor Gray
Write-Host "  └── $MONITOR_TASK_NAME (Monitors MT5 every 5 minutes)" -ForegroundColor Gray
Write-Host ""
Write-Host "  Scripts Created:" -ForegroundColor Yellow
Write-Host "  ├── $SCRIPT_PATH" -ForegroundColor Gray
Write-Host "  └── $monitorScriptPath" -ForegroundColor Gray
Write-Host ""
Write-Host "  How It Works:" -ForegroundColor Yellow
Write-Host "  1. MT5 starts automatically on VPS boot" -ForegroundColor White
Write-Host "  2. Monitoring task checks MT5 every 5 minutes" -ForegroundColor White
Write-Host "  3. If MT5 is closed, monitoring task restarts it" -ForegroundColor White
Write-Host "  4. Watchdog monitors Price Feeder and MT5 health" -ForegroundColor White
Write-Host ""
Write-Host "  To Verify:" -ForegroundColor Yellow
Write-Host "  - Check Task Scheduler: taskschd.msc" -ForegroundColor White
Write-Host "  - Look for tasks: $TASK_NAME and $MONITOR_TASK_NAME" -ForegroundColor White
Write-Host "  - Test: Close MT5 manually, wait 5 minutes, it should restart" -ForegroundColor White
Write-Host ""
