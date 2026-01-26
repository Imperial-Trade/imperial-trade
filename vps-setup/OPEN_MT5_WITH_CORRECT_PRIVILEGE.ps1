# Open MT5 with the correct privilege level based on current session

Write-Host "=== OPENING MT5 WITH CORRECT PRIVILEGE ===" -ForegroundColor Cyan
Write-Host ""

$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

$mt5Path = "C:\Program Files\MetaTrader 5\terminal64.exe"

if (-not (Test-Path $mt5Path)) {
    Write-Host "[ERROR] MT5 not found at: $mt5Path" -ForegroundColor Red
    exit 1
}

# Check if MT5 is already running
$mt5Running = Get-Process -Name "terminal64" -ErrorAction SilentlyContinue
if ($mt5Running) {
    Write-Host "[WARNING] MT5 is already running" -ForegroundColor Yellow
    Write-Host "   Process IDs: $($mt5Running.Id -join ', ')" -ForegroundColor White
    Write-Host ""
    Write-Host "If you need to restart MT5, close it first" -ForegroundColor Yellow
    exit 0
}

if ($isAdmin) {
    Write-Host "[OK] Running as Administrator" -ForegroundColor Green
    Write-Host "Opening MT5 as Administrator..." -ForegroundColor Yellow
    
    # Open as Administrator (we're already admin, so just start it)
    Start-Process -FilePath $mt5Path -Verb RunAs -WorkingDirectory "C:\Program Files\MetaTrader 5"
    
    Write-Host "[OK] MT5 opened as Administrator" -ForegroundColor Green
} else {
    Write-Host "[INFO] Running as Regular User" -ForegroundColor Cyan
    Write-Host "Opening MT5 normally (not elevated)..." -ForegroundColor Yellow
    
    # Open normally (not elevated)
    Start-Process -FilePath $mt5Path -WorkingDirectory "C:\Program Files\MetaTrader 5"
    
    Write-Host "[OK] MT5 opened as Regular User" -ForegroundColor Green
}

Write-Host ""
Write-Host "Waiting 5 seconds for MT5 to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Verify MT5 started
$mt5Process = Get-Process -Name "terminal64" -ErrorAction SilentlyContinue
if ($mt5Process) {
    Write-Host "[OK] MT5 is running (PID: $($mt5Process.Id))" -ForegroundColor Green
} else {
    Write-Host "[WARNING] MT5 process not detected yet" -ForegroundColor Yellow
}

