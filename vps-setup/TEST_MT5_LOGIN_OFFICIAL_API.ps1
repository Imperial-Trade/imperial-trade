# Test MT5 Login with Official API Timeout Parameter

Write-Host "=== TESTING MT5 LOGIN WITH OFFICIAL API ===" -ForegroundColor Cyan
Write-Host ""

# Create test credentials JSON file
$testCreds = @{
    login = "800107112"
    password = "test123"
    server = "ECMarketsLtd-Demo"
} | ConvertTo-Json -Compress

$testFile = "$env:TEMP\test_mt5_creds.json"
$testCreds | Out-File -FilePath $testFile -Encoding UTF8 -NoNewline

Write-Host "Testing Python script with official timeout parameter..." -ForegroundColor Yellow
Write-Host "Credentials: Login=800107112, Server=ECMarketsLtd-Demo" -ForegroundColor Gray
Write-Host ""

cd C:\vps-broker-service\python

# Read JSON from file to avoid PowerShell escaping issues
$jsonContent = Get-Content $testFile -Raw
python test_connection.py $jsonContent 2>&1

# Cleanup
Remove-Item $testFile -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "=== TEST COMPLETE ===" -ForegroundColor Cyan

