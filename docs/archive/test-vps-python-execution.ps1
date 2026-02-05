# Test Python MT5 Script Execution on VPS
# This tests if Python can properly execute the MT5 connection script

Write-Host "Testing Python MT5 Script Execution" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Change to service directory
Set-Location C:\vps-broker-service

# Test 1: Check Python version
Write-Host "Test 1: Python Version" -ForegroundColor Yellow
python --version
Write-Host ""

# Test 2: Check if Python can import MetaTrader5
Write-Host "Test 2: MT5 Module Import" -ForegroundColor Yellow
python -c "import MetaTrader5 as mt5; print('MT5 module version:', mt5.__version__)"
Write-Host ""

# Test 3: Test script execution with test credentials
Write-Host "Test 3: Script Execution" -ForegroundColor Yellow
$testCredentials = @{
    login = "800107112"
    password = "Demo@123"
    server = "ECMarkets-MT5-Demo"
} | ConvertTo-Json -Compress

python python\test_connection.py $testCredentials
Write-Host ""

Write-Host "Test Complete" -ForegroundColor Green







