# Fix Network Connection Issues for VPS Broker Service
# This script addresses common networking problems that prevent Edge Functions from connecting to the VPS

Write-Host "🔧 Fixing Network Connection Issues for VPS Broker Service" -ForegroundColor Cyan
Write-Host ""

# Step 1: Rebuild the service with the 0.0.0.0 fix
Write-Host "📦 Step 1: Rebuilding service with 0.0.0.0 binding..." -ForegroundColor Yellow
Set-Location "C:\vps-broker-service"
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Service rebuilt successfully" -ForegroundColor Green
Write-Host ""

# Step 2: Configure Windows Firewall to allow port 3001
Write-Host "🔥 Step 2: Configuring Windows Firewall for port 3001..." -ForegroundColor Yellow

# Check if rule already exists
$existingRule = Get-NetFirewallRule -DisplayName "JournalAPI-Port3001" -ErrorAction SilentlyContinue

if ($existingRule) {
    Write-Host "⚠️  Firewall rule already exists, removing old rule..." -ForegroundColor Yellow
    Remove-NetFirewallRule -DisplayName "JournalAPI-Port3001" -ErrorAction SilentlyContinue
}

# Create new firewall rule
try {
    New-NetFirewallRule -DisplayName "JournalAPI-Port3001" `
        -Direction Inbound `
        -Protocol TCP `
        -LocalPort 3001 `
        -Action Allow `
        -Description "Allow Imperial Trade Broker Service on port 3001" | Out-Null
    
    Write-Host "✅ Firewall rule created successfully" -ForegroundColor Green
    
    # Verify the rule
    $rule = Get-NetFirewallRule -DisplayName "JournalAPI-Port3001"
    Write-Host "   Rule Status: $($rule.Enabled)" -ForegroundColor Gray
    Write-Host "   Rule Direction: $($rule.Direction)" -ForegroundColor Gray
    Write-Host "   Rule Action: $($rule.Action)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Failed to create firewall rule: $_" -ForegroundColor Red
    Write-Host "   You may need to run this script as Administrator" -ForegroundColor Yellow
}
Write-Host ""

# Step 3: Restart PM2 service
Write-Host "🔄 Step 3: Restarting PM2 service..." -ForegroundColor Yellow

# Stop existing service
pm2 stop imperial-trade-broker-service 2>$null
pm2 delete imperial-trade-broker-service 2>$null

# Start service
pm2 start "C:\vps-broker-service\dist\index.js" `
    --name imperial-trade-broker-service `
    --cwd "C:\vps-broker-service"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Service restarted successfully" -ForegroundColor Green
    pm2 save
} else {
    Write-Host "❌ Failed to restart service" -ForegroundColor Red
}
Write-Host ""

# Step 4: Test local connectivity
Write-Host "🧪 Step 4: Testing local connectivity..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    Write-Host "✅ Local health check passed (HTTP $($response.StatusCode))" -ForegroundColor Green
    Write-Host "   Response: $($response.Content)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Local health check failed: $_" -ForegroundColor Red
}
Write-Host ""

# Step 5: Test external IP connectivity
Write-Host "🌐 Step 5: Getting VPS external IP..." -ForegroundColor Yellow
try {
    $externalIP = (Invoke-WebRequest -Uri "https://api.ipify.org" -UseBasicParsing -TimeoutSec 5).Content
    Write-Host "   Your VPS External IP: $externalIP" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📋 Next Steps:" -ForegroundColor Yellow
    Write-Host "   1. Test from your local machine:" -ForegroundColor White
    Write-Host "      curl http://$externalIP:3001/health" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   2. If that fails, check:" -ForegroundColor White
    Write-Host "      - Vultr/AWS firewall rules (in cloud provider dashboard)" -ForegroundColor Gray
    Write-Host "      - Verify Edge Function can reach: http://$externalIP:3001" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   3. For HTTPS/SSL (recommended for production):" -ForegroundColor White
    Write-Host "      - Set up nginx reverse proxy with Let's Encrypt" -ForegroundColor Gray
    Write-Host "      - Or use ngrok for testing: ngrok http 3001" -ForegroundColor Gray
} catch {
    Write-Host "⚠️  Could not determine external IP: $_" -ForegroundColor Yellow
}
Write-Host ""

# Step 6: Show PM2 status
Write-Host "📊 PM2 Service Status:" -ForegroundColor Yellow
pm2 status
Write-Host ""

# Step 7: Show recent logs
Write-Host "📝 Recent Service Logs (last 20 lines):" -ForegroundColor Yellow
pm2 logs imperial-trade-broker-service --lines 20 --nostream
Write-Host ""

Write-Host "✅ Network configuration complete!" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  IMPORTANT: If Edge Function still can't connect, it's likely an HTTPS/HTTP mixed content issue." -ForegroundColor Yellow
Write-Host "   Edge Functions run on HTTPS, but your VPS is HTTP. Solutions:" -ForegroundColor Yellow
Write-Host "   1. Set up nginx + Let's Encrypt for HTTPS on VPS" -ForegroundColor White
Write-Host "   2. Use ngrok for testing (ngrok http 3001)" -ForegroundColor White
Write-Host "   3. Use Cloudflare Tunnel for production" -ForegroundColor White







