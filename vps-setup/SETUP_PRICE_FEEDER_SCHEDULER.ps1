# ============================================================================
# SETUP PRICE FEEDER WITH WINDOWS TASK SCHEDULER
# ============================================================================
# This creates a Windows Task Scheduler job that runs the Python price streamer
# in Session 1 (interactive) to avoid Windows Session Isolation issues
# ============================================================================

Write-Host ""
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "  SETTING UP PRICE FEEDER WITH WINDOWS TASK SCHEDULER" -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""

$TASK_NAME = "ImperialPriceFeederMT5"
$PYTHON_SCRIPT = "C:\imperial-price-feeder\python\mt5_price_streamer.py"
$WORKING_DIR = "C:\imperial-price-feeder"
$OUTPUT_FILE = "C:\imperial-price-feeder\prices.json"

# ============================================================================
# STEP 1: Verify Python script exists
# ============================================================================
Write-Host "STEP 1: Verifying Python script..." -ForegroundColor Yellow

if (-not (Test-Path $PYTHON_SCRIPT)) {
    Write-Host "  [ERROR] Python script NOT FOUND: $PYTHON_SCRIPT" -ForegroundColor Red
    exit 1
}

Write-Host "  [OK] Python script found: $PYTHON_SCRIPT" -ForegroundColor Green
Write-Host ""

# ============================================================================
# STEP 2: Create output directory
# ============================================================================
Write-Host "STEP 2: Creating output directory..." -ForegroundColor Yellow

$outputDir = Split-Path $OUTPUT_FILE
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
    Write-Host "  [OK] Created output directory: $outputDir" -ForegroundColor Green
} else {
    Write-Host "  [OK] Output directory exists: $outputDir" -ForegroundColor Green
}
Write-Host ""

# ============================================================================
# STEP 3: Delete existing task if it exists
# ============================================================================
Write-Host "STEP 3: Checking for existing task..." -ForegroundColor Yellow

$existingTask = Get-ScheduledTask -TaskName $TASK_NAME -ErrorAction SilentlyContinue
if ($existingTask) {
    Write-Host "  [INFO] Existing task found, deleting..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $TASK_NAME -Confirm:$false -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Host "  [OK] Existing task deleted" -ForegroundColor Green
} else {
    Write-Host "  [OK] No existing task found" -ForegroundColor Green
}
Write-Host ""

# ============================================================================
# STEP 4: Create new scheduled task
# ============================================================================
Write-Host "STEP 4: Creating Windows Task Scheduler job..." -ForegroundColor Yellow

# Create action (run Python script)
$action = New-ScheduledTaskAction -Execute "python" -Argument "`"$PYTHON_SCRIPT`"" -WorkingDirectory $WORKING_DIR

# Create trigger (run at system startup and when user logs on)
$trigger1 = New-ScheduledTaskTrigger -AtStartup
$trigger2 = New-ScheduledTaskTrigger -AtLogOn

# Create settings (run as current user, allow task to run on demand, don't stop on idle)
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)

# Register the task
try {
    Register-ScheduledTask -TaskName $TASK_NAME -Action $action -Trigger @($trigger1, $trigger2) -Principal $principal -Settings $settings -Description "Imperial Price Feeder - Maintains MT5 connection and streams prices to JSON file" -Force | Out-Null
    Write-Host "  [OK] Task created successfully" -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] Failed to create task: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# ============================================================================
# STEP 5: Start the task immediately
# ============================================================================
Write-Host "STEP 5: Starting task..." -ForegroundColor Yellow

try {
    Start-ScheduledTask -TaskName $TASK_NAME -ErrorAction Stop
    Start-Sleep -Seconds 5
    $taskState = (Get-ScheduledTaskInfo -TaskName $TASK_NAME).State
    Write-Host "  [OK] Task started. State: $taskState" -ForegroundColor Green
} catch {
    Write-Host "  [WARN] Failed to start task automatically: $_" -ForegroundColor Yellow
    Write-Host "         You can start it manually with: Start-ScheduledTask -TaskName '$TASK_NAME'" -ForegroundColor Gray
}
Write-Host ""

# ============================================================================
# STEP 6: Verify task is running
# ============================================================================
Write-Host "STEP 6: Verifying task status..." -ForegroundColor Yellow

$taskInfo = Get-ScheduledTaskInfo -TaskName $TASK_NAME
Write-Host "  Task Name: $TASK_NAME" -ForegroundColor White
Write-Host "  State: $($taskInfo.State)" -ForegroundColor White
Write-Host "  Last Run: $($taskInfo.LastRunTime)" -ForegroundColor White
Write-Host "  Next Run: $($taskInfo.NextRunTime)" -ForegroundColor White
Write-Host ""

# Check if output file is being created
Start-Sleep -Seconds 10
if (Test-Path $OUTPUT_FILE) {
    $fileContent = Get-Content $OUTPUT_FILE -Raw | ConvertFrom-Json
    Write-Host "  [OK] Output file exists: $OUTPUT_FILE" -ForegroundColor Green
    Write-Host "  Status: $($fileContent.status)" -ForegroundColor White
    Write-Host "  Prices: $($fileContent.count)" -ForegroundColor White
    Write-Host "  Timestamp: $($fileContent.timestamp)" -ForegroundColor White
} else {
    Write-Host "  [WARN] Output file not created yet: $OUTPUT_FILE" -ForegroundColor Yellow
    Write-Host "         This is normal if the task just started. Check again in 15 seconds." -ForegroundColor Gray
}
Write-Host ""

# ============================================================================
# FINAL SUMMARY
# ============================================================================
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "  SETUP COMPLETE!" -ForegroundColor Green
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Task Information:" -ForegroundColor Yellow
Write-Host "  Name: $TASK_NAME" -ForegroundColor White
Write-Host "  Python Script: $PYTHON_SCRIPT" -ForegroundColor White
Write-Host "  Output File: $OUTPUT_FILE" -ForegroundColor White
Write-Host ""
Write-Host "Management Commands:" -ForegroundColor Yellow
Write-Host "  Start:   Start-ScheduledTask -TaskName '$TASK_NAME'" -ForegroundColor White
Write-Host "  Stop:    Stop-ScheduledTask -TaskName '$TASK_NAME'" -ForegroundColor White
Write-Host "  Status:  Get-ScheduledTaskInfo -TaskName '$TASK_NAME'" -ForegroundColor White
Write-Host "  Delete:  Unregister-ScheduledTask -TaskName '$TASK_NAME' -Confirm:`$false" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Ensure EC Markets MT5 standard installation is logged in to account 81071266" -ForegroundColor White
Write-Host "  2. Verify output file is being updated: Get-Content '$OUTPUT_FILE' | ConvertFrom-Json" -ForegroundColor White
Write-Host "  3. Update Node.js Price Feeder to read from $OUTPUT_FILE instead of spawning Python" -ForegroundColor White
Write-Host ""
