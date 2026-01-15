# Deployment script to copy fixed Python files to VPS
# Run this in PowerShell on the VPS

Write-Host "Deploying Python fixes..." -ForegroundColor Green

# The fixed files should be in the local workspace
# This script assumes you'll copy them manually or use git pull

$fetchPath = "C:\vps-broker-service\python\fetch_trades.py"
$testPath = "C:\vps-broker-service\python\test_connection.py"

Write-Host "`nVerifying files..." -ForegroundColor Yellow
if (Test-Path $fetchPath) {
    $content = Get-Content $fetchPath -Raw
    if ($content -match "initialized_by_us") {
        Write-Host "  SUCCESS: fetch_trades.py is FIXED" -ForegroundColor Green
    } else {
        Write-Host "  FAILED: fetch_trades.py needs update" -ForegroundColor Red
    }
} else {
    Write-Host "  ERROR: fetch_trades.py not found" -ForegroundColor Red
}

if (Test-Path $testPath) {
    $content = Get-Content $testPath -Raw
    if ($content -match "initialized_by_us") {
        Write-Host "  SUCCESS: test_connection.py is FIXED" -ForegroundColor Green
    } else {
        Write-Host "  FAILED: test_connection.py needs update" -ForegroundColor Red
    }
} else {
    Write-Host "  ERROR: test_connection.py not found" -ForegroundColor Red
}

Write-Host "`nRestarting Broker Service..." -ForegroundColor Yellow
pm2 restart "Imperial Broker Service" --update-env

Write-Host "`nDone!" -ForegroundColor Green

