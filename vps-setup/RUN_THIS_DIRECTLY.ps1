# Copy and paste this ENTIRE block into PowerShell on VPS
Write-Host "=== SYSTEM STATUS ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "FILES:" -ForegroundColor Yellow
$files = @(
    @{Name="RUN_THIS_NOW.ps1"; Path="C:\vps-broker-service\vps-setup\RUN_THIS_NOW.ps1"},
    @{Name="index.js"; Path="C:\vps-broker-service\dist\index.js"},
    @{Name="MT5 terminal64.exe"; Path="C:\MT5_BrokerService\terminal64.exe"}
)
foreach ($f in $files) {
    if (Test-Path $f.Path) {
        $size = (Get-Item $f.Path).Length
        Write-Host "  OK: $($f.Name) ($size bytes)" -ForegroundColor Green
    } else {
        Write-Host "  MISSING: $($f.Name)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "PM2 SERVICES:" -ForegroundColor Yellow
pm2 status

Write-Host ""
Write-Host "PORT 3001:" -ForegroundColor Yellow
$port = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
if ($port) {
    Write-Host "  OK: LISTENING" -ForegroundColor Green
    $port | Format-Table LocalAddress, LocalPort, State -AutoSize
} else {
    Write-Host "  NOT LISTENING" -ForegroundColor Red
}

Write-Host ""
Write-Host "MT5 PROCESS:" -ForegroundColor Yellow
$mt5 = Get-Process -Name terminal64 -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*MT5_BrokerService*" }
if ($mt5) {
    Write-Host "  OK: RUNNING" -ForegroundColor Green
    $mt5 | Format-Table Name, Path, Id -AutoSize
} else {
    Write-Host "  NOT RUNNING" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== DONE ===" -ForegroundColor Green
