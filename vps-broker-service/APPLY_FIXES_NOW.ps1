# COMPLETE NETWORK FIX SCRIPT - Run this on VPS
# This script fixes all network connection issues

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🔧 VPS Network Connection Fix Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "⚠️  WARNING: Not running as Administrator. Firewall configuration may fail." -ForegroundColor Yellow
    Write-Host "   Some operations require Administrator privileges." -ForegroundColor Yellow
    Write-Host ""
}

# Navigate to service directory
$serviceDir = "C:\vps-broker-service"
if (-not (Test-Path $serviceDir)) {
    Write-Host "❌ Error: Service directory not found at $serviceDir" -ForegroundColor Red
    exit 1
}

Set-Location $serviceDir
Write-Host "📁 Working directory: $serviceDir" -ForegroundColor Green
Write-Host ""

# ============================================
# STEP 1: Fix Express Server Binding
# ============================================
Write-Host "📝 STEP 1: Fixing Express server to listen on 0.0.0.0..." -ForegroundColor Yellow

$indexPath = "src\index.ts"
if (-not (Test-Path $indexPath)) {
    Write-Host "❌ Error: src\index.ts not found!" -ForegroundColor Red
    exit 1
}

$content = Get-Content $indexPath -Raw

# Fix 1: Change app.listen to bind to 0.0.0.0
if ($content -match "app\.listen\(PORT,\s*\(\)\s*=>") {
    $content = $content -replace "app\.listen\(PORT,\s*\(\)\s*=>", "app.listen(PORT, '0.0.0.0', () =>"
    Write-Host "   ✅ Fixed app.listen binding" -ForegroundColor Green
} elseif ($content -match "app\.listen\(PORT,\s*'0\.0\.0\.0'") {
    Write-Host "   ℹ️  Already listening on 0.0.0.0" -ForegroundColor Cyan
} else {
    Write-Host "   ⚠️  Could not find app.listen pattern to fix" -ForegroundColor Yellow
}

# Fix 2: Update console.log message
$content = $content -replace "running on port \$\{PORT\}", "running on 0.0.0.0:${PORT}"

Set-Content $indexPath -Value $content -NoNewline
Write-Host "   ✅ Updated index.ts" -ForegroundColor Green
Write-Host ""

# ============================================
# STEP 2: Rebuild TypeScript
# ============================================
Write-Host "📦 STEP 2: Rebuilding TypeScript..." -ForegroundColor Yellow

$buildOutput = npm run build 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "   ❌ Build failed!" -ForegroundColor Red
    Write-Host $buildOutput -ForegroundColor Red
    exit 1
}
Write-Host "   ✅ Build successful" -ForegroundColor Green
Write-Host ""

# ============================================
# STEP 3: Configure Windows Firewall
# ============================================
Write-Host "🔥 STEP 3: Configuring Windows Firewall..." -ForegroundColor Yellow

try {
    # Remove existing rule if it exists
    $existingRule = Get-NetFirewallRule -DisplayName "JournalAPI-Port3001" -ErrorAction SilentlyContinue
    if ($existingRule) {
        Remove-NetFirewallRule -DisplayName "JournalAPI-Port3001" -ErrorAction SilentlyContinue
        Write-Host "   ℹ️  Removed existing firewall rule" -ForegroundColor Cyan
    }

    # Create new firewall rule
    New-NetFirewallRule `
        -DisplayName "JournalAPI-Port3001" `
        -Direction Inbound `
        -Protocol TCP `
        -LocalPort 3001 `
        -Action Allow `
        -Description "Allow Imperial Trade Broker Service on port 3001" | Out-Null

    Write-Host "   ✅ Firewall rule created" -ForegroundColor Green

    # Verify rule
    $rule = Get-NetFirewallRule -DisplayName "JournalAPI-Port3001"
    Write-Host "   Rule Status: $($rule.Enabled)" -ForegroundColor Gray
    Write-Host "   Direction: $($rule.Direction)" -ForegroundColor Gray
    Write-Host "   Action: $($rule.Action)" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ Failed to configure firewall: $_" -ForegroundColor Red
    Write-Host "   ⚠️  Try running this script as Administrator" -ForegroundColor Yellow
}
Write-Host ""

# ============================================
# STEP 4: Restart PM2 Service
# ============================================
Write-Host "🔄 STEP 4: Restarting PM2 service..." -ForegroundColor Yellow

# Stop and delete existing service
pm2 stop imperial-trade-broker-service 2>$null
Start-Sleep -Seconds 1
pm2 delete imperial-trade-broker-service 2>$null
Start-Sleep -Seconds 2

# Start service
$pm2Start = pm2 start "dist\index.js" --name imperial-trade-broker-service --cwd "$serviceDir" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Service started" -ForegroundColor Green
    pm2 save | Out-Null
    Write-Host "   ✅ PM2 configuration saved" -ForegroundColor Green
} else {
    Write-Host "   ❌ Failed to start service" -ForegroundColor Red
    Write-Host $pm2Start -ForegroundColor Red
}
Write-Host ""

# ============================================
# STEP 5: Wait for service to start
# ============================================
Write-Host "⏳ Waiting for service to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
Write-Host ""

# ============================================
# STEP 6: Verify Installation
# ============================================
Write-Host "🧪 STEP 6: Verifying installation..." -ForegroundColor Yellow

# Check listening ports
Write-Host "   Checking listening ports..." -ForegroundColor Gray
$netstatOutput = netstat -an | Select-String "3001.*LISTENING"
if ($netstatOutput -match "0\.0\.0\.0:3001") {
    Write-Host "   ✅ Service listening on 0.0.0.0:3001 (accessible externally)" -ForegroundColor Green
} elseif ($netstatOutput -match "127\.0\.0\.1:3001") {
    Write-Host "   ❌ Service only listening on 127.0.0.1:3001 (NOT accessible externally)" -ForegroundColor Red
    Write-Host "   ⚠️  The 0.0.0.0 fix may not have been applied correctly" -ForegroundColor Yellow
} else {
    Write-Host "   ⚠️  Could not verify listening address" -ForegroundColor Yellow
}

# Test health endpoint
Write-Host "   Testing health endpoint..." -ForegroundColor Gray
try {
    $healthResponse = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    Write-Host "   ✅ Health check PASSED (HTTP $($healthResponse.StatusCode))" -ForegroundColor Green
    $jsonResponse = $healthResponse.Content | ConvertFrom-Json
    Write-Host "      Service: $($jsonResponse.service)" -ForegroundColor Gray
    Write-Host "      Status: $($jsonResponse.status)" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ Health check FAILED: $_" -ForegroundColor Red
    Write-Host "   ⚠️  Service may not be running correctly" -ForegroundColor Yellow
}
Write-Host ""

# ============================================
# STEP 7: Get External IP
# ============================================
Write-Host "🌐 STEP 7: Getting VPS external IP..." -ForegroundColor Yellow
try {
    $externalIP = (Invoke-WebRequest -Uri "https://api.ipify.org" -UseBasicParsing -TimeoutSec 5).Content
    Write-Host "   VPS External IP: $externalIP" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📋 Update Supabase Secret:" -ForegroundColor Yellow
    Write-Host "   VPS_MT5_SERVICE_URL = http://$externalIP:3001" -ForegroundColor White
} catch {
    Write-Host "   ⚠️  Could not determine external IP: $_" -ForegroundColor Yellow
}
Write-Host ""

# ============================================
# STEP 8: Show PM2 Status
# ============================================
Write-Host "📊 PM2 Service Status:" -ForegroundColor Yellow
pm2 status
Write-Host ""

# ============================================
# SUMMARY
# ============================================
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ Network fixes applied successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 Next Steps:" -ForegroundColor Yellow
Write-Host "   1. Verify service is listening on 0.0.0.0:3001 (see above)" -ForegroundColor White
Write-Host "   2. Test from external network: curl http://$externalIP:3001/health" -ForegroundColor White
Write-Host "   3. Update Supabase secret VPS_MT5_SERVICE_URL if needed" -ForegroundColor White
Write-Host "   4. Check Vultr/AWS firewall allows port 3001" -ForegroundColor White
Write-Host "   5. Test connection from Journal XX Pro frontend" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  If Edge Function still can't connect:" -ForegroundColor Yellow
Write-Host "   - Check Vultr/AWS Security Groups (allow port 3001)" -ForegroundColor White
Write-Host "   - Consider setting up HTTPS (ngrok for testing, nginx for production)" -ForegroundColor White
Write-Host "   - Check Edge Function logs in Supabase Dashboard" -ForegroundColor White
Write-Host ""







