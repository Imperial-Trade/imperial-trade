# QUICK DEPLOYMENT SCRIPT
# Run this on Windows VPS as Administrator

Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  🚀 DEPLOYING BROKER SERVICE" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "❌ ERROR: This script must be run as Administrator" -ForegroundColor Red
    Write-Host "   Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Running as Administrator" -ForegroundColor Green
Write-Host ""

# Navigate to broker service directory
$brokerServicePath = "C:\vps-broker-service"
if (-not (Test-Path $brokerServicePath)) {
    Write-Host "❌ Broker service directory not found: $brokerServicePath" -ForegroundColor Red
    exit 1
}

Set-Location $brokerServicePath
Write-Host "📁 Current directory: $(Get-Location)" -ForegroundColor Cyan
Write-Host ""

# Check if deployment script exists
$deployScript = "$brokerServicePath\vps-setup\DEPLOY_NOW_SAFE.ps1"
if (-not (Test-Path $deployScript)) {
    Write-Host "❌ Deployment script not found: $deployScript" -ForegroundColor Red
    Write-Host "   Please ensure the script exists in the vps-setup folder" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Deployment script found" -ForegroundColor Green
Write-Host ""

# Check Price Feeder status before deployment
Write-Host "🔒 Checking Price Feeder status..." -ForegroundColor Yellow
$priceFeederStatus = pm2 list | Select-String "Imperial Price Feeder"
if ($priceFeederStatus) {
    Write-Host "✅ Price Feeder is running - will be protected" -ForegroundColor Green
} else {
    Write-Host "⚠️  Price Feeder is NOT running" -ForegroundColor Yellow
}
Write-Host ""

# Run the deployment script
Write-Host "🚀 Starting deployment..." -ForegroundColor Cyan
Write-Host ""

try {
    & $deployScript
    $exitCode = $LASTEXITCODE
    
    if ($exitCode -eq 0) {
        Write-Host ""
        Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor Green
        Write-Host "  ✅ DEPLOYMENT COMPLETED SUCCESSFULLY" -ForegroundColor Green
        Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor Green
        Write-Host ""
        
        # Verify services
        Write-Host "📊 Verifying services..." -ForegroundColor Yellow
        pm2 list
        Write-Host ""
        
        # Test health endpoint
        Write-Host "🧪 Testing health endpoint..." -ForegroundColor Yellow
        $apiKey = "bfa602cd4a12c93cd6a0f6cab9d93ff7b0fcd4dd2392f94e48db2013d679990d"
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -Headers @{"X-API-Key"=$apiKey} -UseBasicParsing
            Write-Host "✅ Health endpoint responded: $($response.StatusCode)" -ForegroundColor Green
            Write-Host "   Response: $($response.Content.Substring(0, [Math]::Min(100, $response.Content.Length)))..." -ForegroundColor Gray
        } catch {
            Write-Host "⚠️  Health endpoint test failed: $_" -ForegroundColor Yellow
        }
        
        Write-Host ""
        Write-Host "✅ Deployment complete! You can now test the frontend connection." -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "❌ Deployment script exited with code: $exitCode" -ForegroundColor Red
        exit $exitCode
    }
} catch {
    Write-Host ""
    Write-Host "❌ Error running deployment script: $_" -ForegroundColor Red
    exit 1
}
