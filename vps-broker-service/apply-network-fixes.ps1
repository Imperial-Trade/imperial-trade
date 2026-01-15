# Apply Network Connection Fixes - Run this on the VPS
# This script fixes the 0.0.0.0 binding and Windows Firewall issues

Write-Host "🔧 Applying Network Connection Fixes..." -ForegroundColor Cyan
Write-Host ""

# Get the script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# Step 1: Check if we're in the right directory
if (-not (Test-Path "src\index.ts")) {
    Write-Host "❌ Error: src\index.ts not found. Make sure you're running this from vps-broker-service directory." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Found service directory: $scriptDir" -ForegroundColor Green
Write-Host ""

# Step 2: Verify the fix is in index.ts
Write-Host "🔍 Step 1: Verifying 0.0.0.0 binding fix..." -ForegroundColor Yellow
$indexContent = Get-Content "src\index.ts" -Raw
if ($indexContent -match "app\.listen\(PORT,\s*'0\.0\.0\.0'") {
    Write-Host "✅ 0.0.0.0 binding is already in index.ts" -ForegroundColor Green
} else {
    Write-Host "⚠️  Fix not found in index.ts. Applying fix..." -ForegroundColor Yellow
    
    # Apply the fix
    $indexContent = $indexContent -replace "app\.listen\(PORT,\s*\(\)\s*=>\s*\{", "app.listen(PORT, '0.0.0.0', () => {"
    $indexContent = $indexContent -replace "console\.log\(\`\`🚀 Imperial Trade Broker Service running on port \$\{PORT\}\`\`\)", "console.log(\`\`🚀 Imperial Trade Broker Service running on 0.0.0.0:${PORT}\`\`)"
    
    Set-Content "src\index.ts" -Value $indexContent -NoNewline
    Write-Host "✅ Fix applied to index.ts" -ForegroundColor Green
}
Write-Host ""

# Step 3: Rebuild the service
Write-Host "📦 Step 2: Rebuilding TypeScript..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed! Check the errors above." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Service rebuilt successfully" -ForegroundColor Green
Write-Host ""

# Step 4: Configure Windows Firewall
Write-Host "🔥 Step 3: Configuring Windows Firewall..." -ForegroundColor Yellow

# Remove existing rule if it exists
$existingRule = Get-NetFirewallRule -DisplayName "JournalAPI-Port3001" -ErrorAction SilentlyContinue
if ($existingRule) {
    Write-Host "   Removing existing firewall rule..." -ForegroundColor Gray
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
    
    # Verify
    $rule = Get-NetFirewallRule -DisplayName "JournalAPI-Port3001"
    Write-Host "   Rule Status: $($rule.Enabled)" -ForegroundColor Gray
    Write-Host "   Direction: $($rule.Direction)" -ForegroundColor Gray
    Write-Host "   Action: $($rule.Action)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Failed to create firewall rule: $_" -ForegroundColor Red
    Write-Host "   Try running PowerShell as Administrator" -ForegroundColor Yellow
}
Write-Host ""

# Step 5: Restart PM2 service
Write-Host "🔄 Step 4: Restarting PM2 service..." -ForegroundColor Yellow

# Stop and delete existing service
pm2 stop imperial-trade-broker-service 2>$null
Start-Sleep -Seconds 1
pm2 delete imperial-trade-broker-service 2>$null
Start-Sleep -Seconds 1

# Start service
pm2 start "dist\index.js" `
    --name imperial-trade-broker-service `
    --cwd "$scriptDir"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Service restarted successfully" -ForegroundColor Green
    pm2 save
    Write-Host "✅ PM2 configuration saved" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to restart service. Check PM2 logs." -ForegroundColor Red
}
Write-Host ""

# Step 6: Wait a bit for service to start
Write-Host "⏳ Waiting for service to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Step 7: Test local connectivity
Write-Host "🧪 Step 5: Testing local connectivity..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    Write-Host "✅ Local health check PASSED (HTTP $($response.StatusCode))" -ForegroundColor Green
    $jsonResponse = $response.Content | ConvertFrom-Json
    Write-Host "   Service: $($jsonResponse.service)" -ForegroundColor Gray
    Write-Host "   Status: $($jsonResponse.status)" -ForegroundColor Gray
    Write-Host "   Uptime: $([math]::Round($jsonResponse.uptime, 2)) seconds" -ForegroundColor Gray
} catch {
    Write-Host "❌ Local health check FAILED: $_" -ForegroundColor Red
    Write-Host "   Check PM2 logs: pm2 logs imperial-trade-broker-service" -ForegroundColor Yellow
}
Write-Host ""

# Step 8: Get external IP
Write-Host "🌐 Step 6: Getting VPS external IP..." -ForegroundColor Yellow
try {
    $externalIP = (Invoke-WebRequest -Uri "https://api.ipify.org" -UseBasicParsing -TimeoutSec 5).Content
    Write-Host "   Your VPS External IP: $externalIP" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📋 Next Steps:" -ForegroundColor Yellow
    Write-Host "   1. Test from external network:" -ForegroundColor White
    Write-Host "      curl http://$externalIP:3001/health" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   2. Update Supabase secret if IP changed:" -ForegroundColor White
    Write-Host "      VPS_MT5_SERVICE_URL = http://$externalIP:3001" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   3. Check Vultr/AWS firewall if external test fails" -ForegroundColor White
} catch {
    Write-Host "⚠️  Could not determine external IP: $_" -ForegroundColor Yellow
}
Write-Host ""

# Step 9: Show PM2 status
Write-Host "📊 PM2 Service Status:" -ForegroundColor Yellow
pm2 status
Write-Host ""

# Step 10: Show listening ports
Write-Host "🔌 Checking if service is listening on 0.0.0.0:3001..." -ForegroundColor Yellow
$listeningPorts = netstat -an | Select-String "3001" | Select-String "LISTENING"
if ($listeningPorts -match "0\.0\.0\.0:3001") {
    Write-Host "✅ Service is listening on 0.0.0.0:3001 (accessible externally)" -ForegroundColor Green
} elseif ($listeningPorts -match "127\.0\.0\.1:3001") {
    Write-Host "❌ Service is only listening on 127.0.0.1:3001 (NOT accessible externally)" -ForegroundColor Red
    Write-Host "   The 0.0.0.0 fix may not have been applied correctly." -ForegroundColor Yellow
} else {
    Write-Host "⚠️  Could not determine listening address" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "✅ Network fixes applied!" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  IMPORTANT: If Edge Function still can't connect:" -ForegroundColor Yellow
Write-Host "   1. Check Vultr/AWS Security Groups - allow port 3001" -ForegroundColor White
Write-Host "   2. Test from Edge Function logs in Supabase Dashboard" -ForegroundColor White
Write-Host "   3. For HTTPS/SSL: Use ngrok (testing) or nginx (production)" -ForegroundColor White







