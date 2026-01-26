# Cleanup Zombie MT5 Processes
# Kills MT5 processes that have been running for more than 5 minutes without activity
# Run manually or schedule to run every hour

Write-Host "🧹 Checking for zombie MT5 processes..." -ForegroundColor Cyan
Write-Host ""

$zombieThreshold = 5 * 60  # 5 minutes in seconds
$lowCpuThreshold = 10      # CPU time in seconds (low activity)
$killedCount = 0
$checkedCount = 0

try {
    $processes = Get-Process terminal64 -ErrorAction SilentlyContinue
    
    if (-not $processes) {
        Write-Host "✅ No terminal64.exe processes found" -ForegroundColor Green
        exit 0
    }
    
    Write-Host "Found $($processes.Count) terminal64.exe process(es)" -ForegroundColor Cyan
    Write-Host ""
    
    foreach ($proc in $processes) {
        $checkedCount++
        $age = (Get-Date) - $proc.StartTime
        $cpuTime = $proc.CPU
        
        # Check if process is a potential zombie
        # Criteria: Older than 5 minutes AND low CPU usage
        $isZombie = $age.TotalSeconds -gt $zombieThreshold -and $cpuTime -lt $lowCpuThreshold
        
        Write-Host "Process PID $($proc.Id):" -ForegroundColor White
        Write-Host "  Age: $([math]::Round($age.TotalMinutes, 2)) minutes"
        Write-Host "  CPU Time: $([math]::Round($cpuTime, 2)) seconds"
        Write-Host "  Memory: $([math]::Round($proc.WS / 1MB, 2)) MB"
        
        if ($isZombie) {
            Write-Host "  Status: ⚠️  POTENTIAL ZOMBIE" -ForegroundColor Yellow
            
            # Ask for confirmation (for safety)
            $confirm = Read-Host "  Kill this process? (y/N)"
            
            if ($confirm -eq "y" -or $confirm -eq "Y") {
                try {
                    Stop-Process -Id $proc.Id -Force
                    Write-Host "  ✅ Killed zombie process: PID $($proc.Id)" -ForegroundColor Green
                    $killedCount++
                } catch {
                    Write-Host "  ❌ Failed to kill process: $($_.Exception.Message)" -ForegroundColor Red
                }
            } else {
                Write-Host "  ⏭️  Skipped (not killed)" -ForegroundColor Yellow
            }
        } else {
            Write-Host "  Status: ✅ Active (not a zombie)" -ForegroundColor Green
        }
        
        Write-Host ""
    }
    
    Write-Host "📊 Summary:" -ForegroundColor Cyan
    Write-Host "   Checked: $checkedCount process(es)"
    Write-Host "   Killed: $killedCount zombie(s)"
    
    if ($killedCount -gt 0) {
        Write-Host ""
        Write-Host "✅ Cleanup complete! Killed $killedCount zombie process(es)" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "✅ No zombies found. All processes are active." -ForegroundColor Green
    }
    
} catch {
    Write-Host "❌ Error checking processes: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Optional: Schedule this script to run every hour
# Uncomment the following lines to create a scheduled task:
<#
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-File C:\vps-broker-service\vps-setup\cleanup-zombie-processes.ps1"
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Hours 1) -RepetitionDuration (New-TimeSpan -Days 365)
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType S4U -RunLevel Highest
Register-ScheduledTask -TaskName "MT5 Zombie Cleanup" -Action $action -Trigger $trigger -Principal $principal -Description "Automatically cleanup orphaned MT5 processes every hour" -Force
Write-Host "✅ Scheduled task created: MT5 Zombie Cleanup" -ForegroundColor Green
#>
