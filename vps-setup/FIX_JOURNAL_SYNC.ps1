# ============================================================================
# FIX JOURNAL SYNC - Ensure All Components Are Working
# ============================================================================
# Run this on VPS PowerShell as Administrator
# This ensures Generic MT5 and Broker Service are ready for journal sync
# ============================================================================

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  FIXING JOURNAL SYNC - Ensuring All Components Ready" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

$genericMT5Path = "C:\Program Files\MetaTrader 5\terminal64.exe"

# Step 1: Ensure Generic MT5 is Running
Write-Host "[1/4] Ensuring Generic MT5 is Running..." -ForegroundColor Yellow
$genericMT5Process = Get-Process -Name terminal64 -ErrorAction SilentlyContinue | Where-Object { $_.Path -like '*MetaTrader 5*' -and $_.Path -notlike '*EC Markets*' }

if (-not $genericMT5Process) {
    if (Test-Path $genericMT5Path) {
        Write-Host "   🔄 Starting Generic MT5..." -ForegroundColor Yellow
        Start-Process $genericMT5Path
        Start-Sleep -Seconds 5
        
        $genericMT5Process = Get-Process -Name terminal64 -ErrorAction SilentlyContinue | Where-Object { $_.Path -like '*MetaTrader 5*' -and $_.Path -notlike '*EC Markets*' }
        if ($genericMT5Process) {
            Write-Host "   ✅ Generic MT5 started successfully" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  Generic MT5 may take longer to start. Please check manually." -ForegroundColor Yellow
        }
    } else {
        Write-Host "   ❌ Generic MT5 is NOT INSTALLED" -ForegroundColor Red
        Write-Host "   💡 Please install Generic MT5 first from: https://www.metatrader5.com/en/download" -ForegroundColor Yellow
        Write-Host "   💡 Install to: C:\Program Files\MetaTrader 5\" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ✅ Generic MT5 is already running (PID: $($genericMT5Process.Id))" -ForegroundColor Green
}
Write-Host ""

# Step 2: Ensure VPS Broker Service is Running
Write-Host "[2/4] Ensuring VPS Broker Service is Running..." -ForegroundColor Yellow
$brokerService = pm2 list 2>&1 | Select-String "imperial-trade-broker-service"

if ($brokerService) {
    $status = pm2 list 2>&1 | Select-String "imperial-trade-broker-service"
    if ($status -match "online") {
        Write-Host "   ✅ VPS Broker Service is running" -ForegroundColor Green
    } else {
        Write-Host "   🔄 Restarting VPS Broker Service..." -ForegroundColor Yellow
        pm2 restart imperial-trade-broker-service 2>&1 | Out-Null
        Start-Sleep -Seconds 3
        $status = pm2 list 2>&1 | Select-String "imperial-trade-broker-service"
        if ($status -match "online") {
            Write-Host "   ✅ VPS Broker Service restarted successfully" -ForegroundColor Green
        } else {
            Write-Host "   ❌ Failed to restart VPS Broker Service" -ForegroundColor Red
        }
    }
} else {
    Write-Host "   ❌ VPS Broker Service NOT FOUND in PM2" -ForegroundColor Red
    Write-Host "   💡 Check if service is deployed at: C:\vps-broker-service" -ForegroundColor Yellow
}
Write-Host ""

# Step 3: Test Broker Service Health
Write-Host "[3/4] Testing Broker Service Health..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    if ($healthResponse.StatusCode -eq 200) {
        $health = $healthResponse.Content | ConvertFrom-Json
        Write-Host "   ✅ Broker Service is healthy" -ForegroundColor Green
        Write-Host "      Status: $($health.status)" -ForegroundColor White
        Write-Host "      Uptime: $([math]::Round($health.uptime, 2)) seconds" -ForegroundColor White
    } else {
        Write-Host "   ⚠️  Broker Service returned status code: $($healthResponse.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ❌ Broker Service health check failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   💡 Check broker service logs: pm2 logs imperial-trade-broker-service --lines 50" -ForegroundColor Yellow
}
Write-Host ""

# Step 4: Save PM2 Configuration
Write-Host "[4/4] Saving PM2 Configuration..." -ForegroundColor Yellow
pm2 save 2>&1 | Out-Null
Write-Host "   ✅ PM2 configuration saved" -ForegroundColor Green
Write-Host ""

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  ✅ JOURNAL SYNC FIX COMPLETE" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Important Notes:" -ForegroundColor Yellow
Write-Host "  1. Generic MT5 must be OPEN and LOGGED IN manually at least once" -ForegroundColor White
Write-Host "  2. Keep Generic MT5 terminal OPEN (don't close it)" -ForegroundColor White
Write-Host "  3. EC Markets MT5 is SEPARATE - used only for live prices" -ForegroundColor White
Write-Host "  4. Both terminals can run simultaneously on the same VPS" -ForegroundColor White
Write-Host ""

Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Open Generic MT5 manually" -ForegroundColor White
Write-Host "  2. Log in with your broker credentials" -ForegroundColor White
Write-Host "  3. Keep the terminal OPEN" -ForegroundColor White
Write-Host "  4. Try syncing trades from the frontend (Journal XX Pro)" -ForegroundColor White
Write-Host ""



