# Test Python script execution
Write-Host "Testing Python installation..." -ForegroundColor Cyan

# Test if Python is available
$pythonCmd = "python"
$pythonTest = & $pythonCmd --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Python not found. Trying python3..." -ForegroundColor Yellow
    $pythonCmd = "python3"
    $pythonTest = & $pythonCmd --version 2>&1
}

Write-Host "Python version: $pythonTest" -ForegroundColor Green

# Test if script exists
$scriptPath = "C:\vps-broker-service\python\fetch_trades.py"
if (Test-Path $scriptPath) {
    Write-Host "Script found at: $scriptPath" -ForegroundColor Green
} else {
    Write-Host "Script NOT found at: $scriptPath" -ForegroundColor Red
    exit 1
}

# Test script with sample credentials
Write-Host "`nTesting script with sample credentials..." -ForegroundColor Cyan
$testCreds = @{
    login = "123456"
    password = "test"
    server = "test-server"
} | ConvertTo-Json -Compress

Write-Host "Running: $pythonCmd `"$scriptPath`" `"$testCreds`"" -ForegroundColor Yellow
$result = & $pythonCmd $scriptPath $testCreds 2>&1

Write-Host "`nExit code: $LASTEXITCODE" -ForegroundColor $(if ($LASTEXITCODE -eq 0) { "Green" } else { "Red" })
Write-Host "Output:" -ForegroundColor Cyan
Write-Host $result





