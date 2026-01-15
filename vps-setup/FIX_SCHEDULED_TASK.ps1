# Fix scheduled task with correct user principal
$taskName = "EnsureMT5AlgorithmicTrading"
$scriptPath = "C:\vps-broker-service\scripts\ENSURE_ALGORITHMIC_TRADING_ALWAYS_ENABLED.ps1"

# Remove existing task if it exists
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
    Write-Host "✅ Removed existing scheduled task" -ForegroundColor Green
}

# Create scheduled task with SYSTEM account (more reliable)
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 5) -RepetitionDuration (New-TimeSpan -Days 365)
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RunOnlyIfNetworkAvailable:$false
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

try {
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description "Ensures Algorithmic Trading is always enabled in Generic MT5" | Out-Null
    Write-Host "✅ Created scheduled task: $taskName" -ForegroundColor Green
    Write-Host "   Runs every 5 minutes as SYSTEM account" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error creating scheduled task: $_" -ForegroundColor Red
    Write-Host "💡 You can manually run the ensure script periodically if needed" -ForegroundColor Yellow
}


