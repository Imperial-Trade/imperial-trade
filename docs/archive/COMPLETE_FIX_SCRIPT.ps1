# ============================================
# COMPLETE VPS NETWORK FIX SCRIPT
# Copy and paste this entire script into PowerShell on your VPS
# ============================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🔧 VPS Network Connection Fix" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Navigate to service directory
$serviceDir = "C:\vps-broker-service"
if (-not (Test-Path $serviceDir)) {
    Write-Host "❌ Error: Service directory not found!" -ForegroundColor Red
    exit 1
}

Set-Location $serviceDir
Write-Host "📁 Working directory: $serviceDir" -ForegroundColor Green
Write-Host ""

# STEP 1: Fix Express Server Binding
Write-Host "📝 STEP 1: Fixing Express server binding..." -ForegroundColor Yellow
$indexPath = "src\index.ts"
if (-not (Test-Path $indexPath)) {
    Write-Host "❌ Error: src\index.ts not found!" -ForegroundColor Red
    exit 1
}

$content = Get-Content $indexPath -Raw
$originalContent = $content

# Fix app.listen to bind to 0.0.0.0
$content = $content -replace "app\.listen\(PORT,\s*\(\)\s*=>", "app.listen(PORT, '0.0.0.0', () =>"
$content = $content -replace "running on port \$\{PORT\}", "running on 0.0.0.0:${PORT}"

if ($content -ne $originalContent) {
    Set-Content $indexPath -Value $content -NoNewline
    Write-Host "✅ Fixed Express server to listen on 0.0.0.0" -ForegroundColor Green
} else {
    Write-Host "ℹ️  Express server already configured for 0.0.0.0" -ForegroundColor Cyan
}
Write-Host ""

# STEP 2: Rebuild Service
Write-Host "📦 STEP 2: Rebuilding TypeScript..." -ForegroundColor Yellow
$buildOutput = npm run build 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    Write-Host $buildOutput -ForegroundColor Red
    exit 1
}
Write-Host "✅ Build successful" -ForegroundColor Green
Write-Host ""

# STEP 3: Configure Windows Firewall
Write-Host "🔥 STEP 3: Configuring Windows Firewall..." -ForegroundColor Yellow
try {
    $existingRule = Get-NetFirewallRule -DisplayName "JournalAPI-Port3001" -ErrorAction SilentlyContinue
    if ($existingRule) {
        Remove-NetFirewallRule -DisplayName "JournalAPI-Port3001" -ErrorAction SilentlyContinue
        Write-Host "   Removed existing rule" -ForegroundColor Gray
    }

    New-NetFirewallRule -DisplayName "JournalAPI-Port3001" -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow -Description "Allow Imperial Trade Broker Service" | Out-Null
    Write-Host "✅ Firewall rule created" -ForegroundColor Green

    $rule = Get-NetFirewallRule -DisplayName "JournalAPI-Port3001"
    Write-Host "   Status: $($rule.Enabled)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Firewall configuration failed: $_" -ForegroundColor Red
    Write-Host "   Try running PowerShell as Administrator" -ForegroundColor Yellow
}
Write-Host ""

# STEP 4: Restart PM2 Service
Write-Host "🔄 STEP 4: Restarting PM2 service..." -ForegroundColor Yellow
pm2 stop imperial-trade-broker-service 2>$null
Start-Sleep -Seconds 1
pm2 delete imperial-trade-broker-service 2>$null
Start-Sleep -Seconds 2

$pm2Start = pm2 start "dist\index.js" --name imperial-trade-broker-service --cwd "$serviceDir" 2>&1
if ($LASTEXITCODE -eq 0) {
    pm2 save | Out-Null
    Write-Host "✅ Service restarted" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to start service" -ForegroundColor Red
    Write-Host $pm2Start -ForegroundColor Red
}
Write-Host ""

# STEP 5: Wait for service
Write-Host "⏳ Waiting for service to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
Write-Host ""

# STEP 6: Verify
Write-Host "🧪 STEP 6: Verifying installation..." -ForegroundColor Yellow

# Check listening ports
$netstatOutput = netstat -an | Select-String "3001.*LISTENING"
if ($netstatOutput -match "0\.0\.0\.0:3001") {
    Write-Host "✅ Service listening on 0.0.0.0:3001 (accessible externally)" -ForegroundColor Green
} elseif ($netstatOutput -match "127\.0\.0\.1:3001") {
    Write-Host "❌ Service only on 127.0.0.1:3001 (NOT accessible externally)" -ForegroundColor Red
} else {
    Write-Host "⚠️  Could not verify listening address" -ForegroundColor Yellow
}

# Test health
try {
    $healthResponse = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ Health check PASSED (HTTP $($healthResponse.StatusCode))" -ForegroundColor Green
    $json = $healthResponse.Content | ConvertFrom-Json
    Write-Host "   Service: $($json.service)" -ForegroundColor Gray
    Write-Host "   Status: $($json.status)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Health check FAILED: $_" -ForegroundColor Red
}
Write-Host ""

# Get external IP
try {
    $externalIP = (Invoke-WebRequest -Uri "https://api.ipify.org" -UseBasicParsing -TimeoutSec 5).Content
    Write-Host "🌐 Your VPS External IP: $externalIP" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📋 Update Supabase Secret:" -ForegroundColor Yellow
    Write-Host "   VPS_MT5_SERVICE_URL = http://$externalIP:3001" -ForegroundColor White
} catch {
    Write-Host "⚠️  Could not get external IP" -ForegroundColor Yellow
}
Write-Host ""

# Show PM2 status
Write-Host "📊 PM2 Status:" -ForegroundColor Yellow
pm2 status
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "✅ All fixes applied!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next Steps:" -ForegroundColor Yellow
Write-Host "   1. Verify netstat shows 0.0.0.0:3001" -ForegroundColor White
Write-Host "   2. Test external: curl http://$externalIP:3001/health" -ForegroundColor White
Write-Host "   3. Update Supabase secret if IP changed" -ForegroundColor White
Write-Host "   4. Check Vultr firewall allows port 3001" -ForegroundColor White
Write-Host ""







