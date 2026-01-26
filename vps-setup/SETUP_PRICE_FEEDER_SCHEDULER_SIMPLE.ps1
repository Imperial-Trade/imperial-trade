# Simple Task Scheduler Setup for Price Feeder
# Creates a task that runs Python streamer on startup and login

$TASK_NAME = "ImperialPriceFeederMT5"
$PYTHON_SCRIPT = "C:\imperial-price-feeder\python\mt5_price_streamer.py"
$WORKING_DIR = "C:\imperial-price-feeder"

Write-Host "=== SETTING UP TASK SCHEDULER ===" -ForegroundColor Cyan

# Delete existing task if exists
Unregister-ScheduledTask -TaskName $TASK_NAME -Confirm:$false -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Create new task
$action = New-ScheduledTaskAction -Execute "python.exe" -Argument "`"$PYTHON_SCRIPT`"" -WorkingDirectory $WORKING_DIR
$trigger1 = New-ScheduledTaskTrigger -AtStartup
$trigger2 = New-ScheduledTaskTrigger -AtLogOn
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)

Register-ScheduledTask -TaskName $TASK_NAME -Action $action -Trigger @($trigger1, $trigger2) -Principal $principal -Settings $settings -Description "Imperial Price Feeder - Maintains MT5 connection" -Force | Out-Null

Write-Host "Task created successfully" -ForegroundColor Green

# Start task
Start-ScheduledTask -TaskName $TASK_NAME
Start-Sleep -Seconds 5

$taskInfo = Get-ScheduledTaskInfo -TaskName $TASK_NAME
Write-Host "Task State: $($taskInfo.State)" -ForegroundColor White
Write-Host "Task Last Run: $($taskInfo.LastRunTime)" -ForegroundColor White
