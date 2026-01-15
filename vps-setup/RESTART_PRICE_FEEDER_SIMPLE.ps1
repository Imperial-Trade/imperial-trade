# Simple script to restart Price Feeder now that Python script is fixed
Write-Host "Restarting Price Feeder..." -ForegroundColor Yellow

# Stop Price Feeder
pm2 delete "Imperial Price Feeder" 2>$null
Start-Sleep -Seconds 3

# Start Price Feeder
if (Test-Path "C:\imperial-price-feeder\pm2-isolated.config.js") {
    pm2 start "C:\imperial-price-feeder\pm2-isolated.config.js"
} else {
    pm2 start "C:\imperial-price-feeder\dist\index.js" --name "Imperial Price Feeder" --cwd "C:\imperial-price-feeder"
}

Start-Sleep -Seconds 5

# Check status
pm2 status | Select-String "Imperial Price Feeder"

# Wait and check logs
Start-Sleep -Seconds 15
Write-Host "Recent logs:" -ForegroundColor Yellow
pm2 logs "Imperial Price Feeder" --lines 20 --nostream | Select-Object -Last 20
