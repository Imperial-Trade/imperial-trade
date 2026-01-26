# Clean rebuild script for Windows VPS
Write-Host "Cleaning old build files..." -ForegroundColor Cyan

# Remove dist folder
if (Test-Path "dist") {
    Remove-Item -Recurse -Force "dist"
    Write-Host "✓ Removed dist folder" -ForegroundColor Green
} else {
    Write-Host "✗ dist folder not found" -ForegroundColor Yellow
}

# Remove node_modules/.cache if exists
if (Test-Path "node_modules\.cache") {
    Remove-Item -Recurse -Force "node_modules\.cache"
    Write-Host "✓ Removed node_modules cache" -ForegroundColor Green
}

Write-Host "`nBuilding TypeScript..." -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✓ Build successful!" -ForegroundColor Green
    Write-Host "`nRestarting PM2 service..." -ForegroundColor Cyan
    pm2 restart "Imperial Broker Service"
    Write-Host "`n✓ Service restarted" -ForegroundColor Green
    Write-Host "`nCheck logs with: pm2 logs 'Imperial Broker Service' --lines 50" -ForegroundColor Yellow
} else {
    Write-Host "`n✗ Build failed! Check errors above." -ForegroundColor Red
}





