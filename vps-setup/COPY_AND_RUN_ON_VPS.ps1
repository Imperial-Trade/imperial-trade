# ============================================================================
# COPY THIS ENTIRE FILE TO VPS POWERSHELL AND RUN IT
# ============================================================================
# This script checks and restarts Price Feeder using PM2
# Run this on VPS PowerShell as Administrator
# ============================================================================

$serviceName = "Imperial Price Feeder"

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  CHECKING AND RESTARTING PRICE FEEDER" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Check PM2
Write-Host "[1/5] Checking PM2..." -ForegroundColor Yellow
if (Get-Command pm2 -ErrorAction SilentlyContinue) {
    Write-Host "   ✅ PM2 installed: v$(pm2 --version)" -ForegroundColor Green
} else {
    Write-Host "   ❌ PM2 NOT FOUND - Install: npm install -g pm2" -ForegroundColor Red
    exit 1
}

# Show all PM2 services
Write-Host "`n[2/5] Current PM2 Services:" -ForegroundColor Yellow
pm2 list

# Check Price Feeder
Write-Host "`n[3/5] Checking Price Feeder..." -ForegroundColor Yellow
$pm2List = pm2 list
$priceFeederFound = $pm2List | Select-String $serviceName

if ($priceFeederFound) {
    Write-Host "   ✅ Price Feeder FOUND" -ForegroundColor Green
    $status = pm2 jlist | ConvertFrom-Json | Where-Object { $_.name -eq $serviceName }
    if ($status) {
        Write-Host "   Status: $($status.pm2_env.status)" -ForegroundColor Gray
        Write-Host "   Uptime: $([math]::Round($status.pm2_env.pm_uptime / 1000 / 60, 1)) minutes" -ForegroundColor Gray
        
        Write-Host "`n   🔄 Restarting Price Feeder..." -ForegroundColor Yellow
        pm2 restart $serviceName
        Start-Sleep -Seconds 3
        Write-Host "   ✅ Price Feeder restarted" -ForegroundColor Green
    }
} else {
    Write-Host "   ❌ Price Feeder NOT FOUND in PM2" -ForegroundColor Red
    Write-Host "   Attempting to start..." -ForegroundColor Yellow
    
    $feederDir = "C:\imperial-price-feeder"
    if (Test-Path "$feederDir\dist\index.js") {
        Set-Location $feederDir
        pm2 start "dist\index.js" --name $serviceName --cwd $feederDir --autorestart --max-restarts 999999 --min-uptime "10s" --restart-delay 5000
        Start-Sleep -Seconds 3
        Write-Host "   ✅ Price Feeder started" -ForegroundColor Green
        Set-Location $env:USERPROFILE
    } else {
        Write-Host "   ❌ Price Feeder files not found in $feederDir" -ForegroundColor Red
    }
}

# Check EC Markets MT5
Write-Host "`n[4/5] Checking EC Markets MT5..." -ForegroundColor Yellow
$mt5Process = Get-Process -Name "terminal64" -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*EC Markets*" }
if ($mt5Process) {
    Write-Host "   ✅ EC Markets MT5 is RUNNING (PID: $($mt5Process.Id))" -ForegroundColor Green
} else {
    Write-Host "   ❌ EC Markets MT5 NOT RUNNING" -ForegroundColor Red
    Write-Host "   🔄 Starting EC Markets MT5..." -ForegroundColor Yellow
    $mt5Path = "C:\Program Files\EC Markets MetaTrader 5\terminal64.exe"
    if (Test-Path $mt5Path) {
        Start-Process $mt5Path
        Start-Sleep -Seconds 5
        Write-Host "   ✅ EC Markets MT5 started" -ForegroundColor Green
        Write-Host "   ⚠️  IMPORTANT: Log in to EC Markets account!" -ForegroundColor Yellow
    }
}

# Save PM2 config
Write-Host "`n[5/5] Saving PM2 Configuration..." -ForegroundColor Yellow
pm2 save | Out-Null
Write-Host "   ✅ PM2 configuration saved" -ForegroundColor Green

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  ✅ COMPLETE - Checking logs..." -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Show final status
pm2 list

Write-Host ""
Write-Host "Price Feeder Logs (Last 20 lines):" -ForegroundColor Yellow
pm2 logs $serviceName --lines 20 --nostream

Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  - Monitor: pm2 logs '$serviceName' --lines 50" -ForegroundColor White
Write-Host "  - Check Supabase database for fresh prices" -ForegroundColor White
Write-Host ""




