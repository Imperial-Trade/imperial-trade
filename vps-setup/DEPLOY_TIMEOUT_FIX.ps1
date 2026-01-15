# Deploy Timeout Fix
# Fixes Edge Function timeout issues by reducing Python script timeouts

Write-Host "🚀 Deploying Timeout Fix..." -ForegroundColor Cyan

# Navigate to service directory
cd C:\vps-broker-service

# Build the service
Write-Host "📦 Building service..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

# Restart the service
Write-Host "🔄 Restarting broker service..." -ForegroundColor Yellow
pm2 restart imperial-trade-broker-service

# Wait a moment for service to start
Start-Sleep -Seconds 2

# Check service status
Write-Host "✅ Checking service status..." -ForegroundColor Yellow
pm2 status imperial-trade-broker-service

# Show recent logs
Write-Host "📋 Recent logs:" -ForegroundColor Yellow
pm2 logs imperial-trade-broker-service --lines 20 --nostream --raw

Write-Host "✅ Timeout fix deployed!" -ForegroundColor Green
Write-Host ""
Write-Host "Changes applied:" -ForegroundColor Cyan
Write-Host "  • Python script timeout: 25s (was 30s)" -ForegroundColor White
Write-Host "  • Quick check timeout: 5s (was no timeout)" -ForegroundColor White
Write-Host "  • Retries: 2 (was 3)" -ForegroundColor White
Write-Host "  • Node.js process timeout: 45s (was 60s)" -ForegroundColor White
Write-Host ""
Write-Host "Expected result: Connection tests should complete within 60 seconds" -ForegroundColor Green
