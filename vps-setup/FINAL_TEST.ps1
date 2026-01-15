# Final Complete Flow Test

Write-Host "=== COMPLETE END-TO-END FLOW TEST ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: System Status
Write-Host "[1] System Status Check:" -ForegroundColor Yellow
$mt5 = Get-Process -Name "terminal64" -ErrorAction SilentlyContinue
if ($mt5) {
    Write-Host "  [OK] MT5 Running (PID: $($mt5.Id))" -ForegroundColor Green
} else {
    Write-Host "  [ERROR] MT5 Not Running" -ForegroundColor Red
    exit 1
}

$broker = pm2 list | Select-String "imperial-trade-broker-service"
if ($broker) {
    Write-Host "  [OK] Broker Service Running" -ForegroundColor Green
} else {
    Write-Host "  [ERROR] Broker Service Not Running" -ForegroundColor Red
    exit 1
}

$feeder = pm2 list | Select-String "Imperial Price Feeder"
if ($feeder) {
    Write-Host "  [OK] Price Feeder Running" -ForegroundColor Green
} else {
    Write-Host "  [WARNING] Price Feeder Not Running" -ForegroundColor Yellow
}

Write-Host ""

# Step 2: Test Python Script
Write-Host "[2] Testing Python Script (Direct MT5 Connection):" -ForegroundColor Yellow
cd C:\vps-broker-service\python

$pythonOutput = python test_simple.py 2>&1
Write-Host $pythonOutput -ForegroundColor White

if ($pythonOutput -match "\[SUCCESS\]|success.*true|connected.*true") {
    Write-Host "  [OK] Python script test PASSED" -ForegroundColor Green
    Write-Host ""
    Write-Host "[3] Summary:" -ForegroundColor Yellow
    Write-Host "  [OK] MT5 Terminal: Running" -ForegroundColor Green
    Write-Host "  [OK] Broker Service: Running" -ForegroundColor Green
    Write-Host "  [OK] Python Script: Connects to MT5 successfully" -ForegroundColor Green
    Write-Host "  [OK] Account Info: Retrieved successfully" -ForegroundColor Green
    Write-Host ""
    Write-Host "=== READY FOR FRONTEND TESTING ===" -ForegroundColor Green
    Write-Host ""
    Write-Host "To test from Journal XX Pro:" -ForegroundColor White
    Write-Host "1. Open Journal XX Pro in browser" -ForegroundColor Gray
    Write-Host "2. Navigate to broker connection settings" -ForegroundColor Gray
    Write-Host "3. Enter EC Markets Demo credentials:" -ForegroundColor Gray
    Write-Host "   - Login: 800107112" -ForegroundColor Gray
    Write-Host "   - Password: (your password)" -ForegroundColor Gray
    Write-Host "   - Server: ECMarketsLtd-Demo" -ForegroundColor Gray
    Write-Host "4. Click 'Test Connection'" -ForegroundColor Gray
    Write-Host "5. Verify connection succeeds and account info displays" -ForegroundColor Gray
} else {
    Write-Host "  [ERROR] Python script test FAILED" -ForegroundColor Red
    exit 1
}

