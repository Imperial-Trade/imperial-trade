# Check Generic MT5 status and test connection
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "  CHECKING GENERIC MT5 STATUS" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host ""

# Check Generic MT5
$genericPath = "C:\Program Files\MetaTrader 5\terminal64.exe"
$generic = Get-Process -Name terminal64 -ErrorAction SilentlyContinue | Where-Object { 
    $_.Path -eq $genericPath 
} | Select-Object -First 1

if ($generic) {
    Write-Host "✅ Generic MT5 is RUNNING (PID: $($generic.Id))" -ForegroundColor Green
} else {
    Write-Host "❌ Generic MT5 is NOT RUNNING" -ForegroundColor Red
    Write-Host "💡 Starting Generic MT5..." -ForegroundColor Yellow
    Start-Process $genericPath
    Write-Host "⏳ Waiting 15 seconds for MT5 to initialize..." -ForegroundColor Yellow
    Start-Sleep -Seconds 15
    Write-Host ""
}

# Check EC Markets MT5
$ecMarkets = Get-Process -Name terminal64 -ErrorAction SilentlyContinue | Where-Object { 
    $_.Path -like '*EC Markets*' 
} | Select-Object -First 1

if ($ecMarkets) {
    Write-Host "✅ EC Markets MT5 is RUNNING (PID: $($ecMarkets.Id))" -ForegroundColor Green
} else {
    Write-Host "⚠️  EC Markets MT5 is NOT RUNNING" -ForegroundColor Yellow
}
Write-Host ""

# Test connection
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "  TESTING CONNECTION" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host ""

$json = '{"login":"800107112","password":"Demo@123","server":"ECMarketsLtd-Demo"}'
Write-Host "Testing with:" -ForegroundColor Yellow
Write-Host "  Login: 800107112" -ForegroundColor Gray
Write-Host "  Server: ECMarketsLtd-Demo" -ForegroundColor Gray
Write-Host ""

try {
    $output = python C:\vps-broker-service\python\test_connection.py $json 2>&1
    Write-Host $output
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}


