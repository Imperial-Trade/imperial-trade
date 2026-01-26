# Copy all scripts and run status check
Write-Host "Copying all scripts..." -ForegroundColor Yellow

$scripts = @(
    "WORKING_STATUS_CHECK.ps1",
    "FINAL_WORKING_SCRIPT.ps1", 
    "GET_STATUS.ps1",
    "RUN_THIS_NOW.ps1",
    "EXECUTE_THIS_ON_VPS.ps1"
)

foreach ($script in $scripts) {
    $path = "C:\vps-broker-service\vps-setup\$script"
    if (Test-Path $path) {
        Write-Host "  OK: $script" -ForegroundColor Green
    } else {
        Write-Host "  MISSING: $script" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Running status check..." -ForegroundColor Yellow
Write-Host ""

if (Test-Path "C:\vps-broker-service\vps-setup\RUN_THIS_NOW.ps1") {
    powershell.exe -ExecutionPolicy Bypass -File "C:\vps-broker-service\vps-setup\RUN_THIS_NOW.ps1"
} else {
    Write-Host "RUN_THIS_NOW.ps1 not found" -ForegroundColor Red
}

exit 0
