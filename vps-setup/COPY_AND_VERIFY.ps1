# Copy all scripts and verify they exist
Write-Host "Copying scripts to VPS..." -ForegroundColor Yellow

$scripts = @(
    "RUN_THIS_NOW.ps1",
    "ULTRA_SIMPLE_CHECK.ps1",
    "WORKING_STATUS_CHECK.ps1",
    "FINAL_WORKING_SCRIPT.ps1"
)

$basePath = "C:\vps-broker-service\vps-setup"

foreach ($script in $scripts) {
    $path = Join-Path $basePath $script
    if (Test-Path $path) {
        $size = (Get-Item $path).Length
        Write-Host "  OK: $script ($size bytes)" -ForegroundColor Green
    } else {
        Write-Host "  MISSING: $script" -ForegroundColor Red
        Write-Host "  Need to copy from: vps-setup\$script" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "All files in vps-setup:" -ForegroundColor Cyan
Get-ChildItem $basePath -Filter "*.ps1" | Select-Object Name, Length | Format-Table -AutoSize

Write-Host ""
Write-Host "To copy missing files, run on local machine:" -ForegroundColor Yellow
Write-Host "  sshpass -p 'password' scp vps-setup/SCRIPT_NAME.ps1 Administrator@45.32.89.134:\"C:/vps-broker-service/vps-setup/\"" -ForegroundColor Gray

exit 0
