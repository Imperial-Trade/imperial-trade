# PowerShell script to create Windows Task Scheduler entry for Price Feeder
# This ensures Price Feeder starts automatically on Windows boot

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  🔒 CREATING WINDOWS STARTUP TASK FOR PRICE FEEDER" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "❌ This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "   Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

# Task name
$taskName = "ImperialPriceFeederAutoStart"

# Check if task already exists
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue

if ($existingTask) {
    Write-Host "⚠️  Task '$taskName' already exists. Removing old task..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

# Create action (start PM2 and ensure Price Feeder is running)
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -Command `"cd C:\imperial-price-feeder; pm2 start dist\index.js --name 'Imperial Price Feeder' --update-env; pm2 save`""

# Create trigger (on system startup)
$trigger = New-ScheduledTaskTrigger -AtStartup

# Create principal (run as current user with highest privileges)
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Highest

# Create settings (allow task to run on demand, restart on failure)
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)

# Register the task
try {
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description "Automatically starts Imperial Price Feeder on Windows boot" | Out-Null
    Write-Host "✅ Windows Task Scheduler entry created successfully!" -ForegroundColor Green
    Write-Host "   Task Name: $taskName" -ForegroundColor Gray
    Write-Host "   Trigger: At Startup" -ForegroundColor Gray
    Write-Host "   Action: Start PM2 Price Feeder" -ForegroundColor Gray
} catch {
    Write-Host "❌ Failed to create scheduled task: $_" -ForegroundColor Red
    exit 1
}

# Also create a health check task that runs every 5 minutes
$healthCheckTaskName = "ImperialPriceFeederHealthCheck"

$existingHealthTask = Get-ScheduledTask -TaskName $healthCheckTaskName -ErrorAction SilentlyContinue
if ($existingHealthTask) {
    Unregister-ScheduledTask -TaskName $healthCheckTaskName -Confirm:$false
}

$healthCheckScript = @"
# Health check script
`$status = pm2 status --no-color
if (`$status -notmatch 'Imperial Price Feeder.*online') {
    pm2 start C:\imperial-price-feeder\dist\index.js --name 'Imperial Price Feeder' --update-env
    pm2 save
}
"@

$healthCheckScriptPath = "C:\vps-broker-service\vps-setup\price-feeder-health-check.ps1"
$healthCheckScript | Out-File -FilePath $healthCheckScriptPath -Encoding UTF8

$healthCheckAction = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$healthCheckScriptPath`""
$healthCheckTrigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 5) -RepetitionDuration (New-TimeSpan -Days 365)
$healthCheckSettings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

try {
    Register-ScheduledTask -TaskName $healthCheckTaskName -Action $healthCheckAction -Trigger $healthCheckTrigger -Principal $principal -Settings $healthCheckSettings -Description "Health check for Imperial Price Feeder - runs every 5 minutes" | Out-Null
    Write-Host "✅ Health check task created successfully!" -ForegroundColor Green
    Write-Host "   Task Name: $healthCheckTaskName" -ForegroundColor Gray
    Write-Host "   Trigger: Every 5 minutes" -ForegroundColor Gray
} catch {
    Write-Host "⚠️  Failed to create health check task: $_" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  ✅ STARTUP TASKS CREATED SUCCESSFULLY" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Created Tasks:" -ForegroundColor Yellow
Write-Host "   1. $taskName - Starts on Windows boot" -ForegroundColor Gray
Write-Host "   2. $healthCheckTaskName - Health check every 5 minutes" -ForegroundColor Gray
Write-Host ""
Write-Host "🔍 To verify tasks:" -ForegroundColor Yellow
Write-Host "   Get-ScheduledTask -TaskName '$taskName'" -ForegroundColor Gray
Write-Host "   Get-ScheduledTask -TaskName '$healthCheckTaskName'" -ForegroundColor Gray
Write-Host ""
