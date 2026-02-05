# Deployment script for Python fixes
# Run this in PowerShell Administrator on the VPS

$ErrorActionPreference = "Stop"

Write-Host "Deploying Python script fixes..." -ForegroundColor Green

# Read the fixed files from codebase (you'll need to copy these files to the VPS first)
# Or we can embed them here using base64

# For now, this script will guide you to manually copy the files
Write-Host "`nPlease copy these files from your local machine to the VPS:" -ForegroundColor Yellow
Write-Host "  Source: vps-broker-service\python\fetch_trades.py" -ForegroundColor Cyan
Write-Host "  Destination: C:\vps-broker-service\python\fetch_trades.py" -ForegroundColor Cyan
Write-Host "`n  Source: vps-broker-service\python\test_connection.py" -ForegroundColor Cyan
Write-Host "  Destination: C:\vps-broker-service\python\test_connection.py" -ForegroundColor Cyan

Write-Host "`nAfter copying, verify the fixes:" -ForegroundColor Yellow
Write-Host "  (Get-Content C:\vps-broker-service\python\fetch_trades.py -Raw) -match 'initialized_by_us'" -ForegroundColor Cyan
Write-Host "  (Get-Content C:\vps-broker-service\python\test_connection.py -Raw) -match 'initialized_by_us'" -ForegroundColor Cyan

Write-Host "`nThen restart the broker service:" -ForegroundColor Yellow
Write-Host "  pm2 restart 'Imperial Broker Service' --update-env" -ForegroundColor Cyan


