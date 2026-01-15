# Check current privilege level and determine how to open MT5

Write-Host "=== CHECKING PRIVILEGE LEVEL ===" -ForegroundColor Cyan
Write-Host ""

$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if ($isAdmin) {
    Write-Host "[OK] Running as Administrator" -ForegroundColor Green
    Write-Host ""
    Write-Host "MT5 should be opened as Administrator" -ForegroundColor Yellow
    Write-Host "Services should run as Administrator" -ForegroundColor Yellow
} else {
    Write-Host "[INFO] Running as Regular User" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "MT5 should be opened normally (not as Administrator)" -ForegroundColor Yellow
    Write-Host "Services should run as Regular User" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Current User: $env:USERNAME" -ForegroundColor White
Write-Host "User Domain: $env:USERDOMAIN" -ForegroundColor White

# Check if PM2 services are running
Write-Host ""
Write-Host "=== CHECKING PM2 SERVICES ===" -ForegroundColor Cyan

$pm2List = pm2 list 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host $pm2List
} else {
    Write-Host "PM2 not found or not running" -ForegroundColor Yellow
}

# Check MT5 processes
Write-Host ""
Write-Host "=== CHECKING MT5 PROCESSES ===" -ForegroundColor Cyan
$mt5Processes = Get-Process -Name "terminal64" -ErrorAction SilentlyContinue
if ($mt5Processes) {
    foreach ($proc in $mt5Processes) {
        $procUser = (Get-WmiObject Win32_Process -Filter "ProcessId = $($proc.Id)").GetOwner()
        Write-Host "MT5 Process ID: $($proc.Id) - User: $($procUser.User)" -ForegroundColor White
    }
} else {
    Write-Host "No MT5 processes found" -ForegroundColor Yellow
}

