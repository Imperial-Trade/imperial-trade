# MT5 Broker Service - Setup Verification Script
# This script verifies that everything is configured correctly

Write-Host "🔍 MT5 Broker Service - Setup Verification" -ForegroundColor Cyan
Write-Host ""

$allChecksPassed = $true

# Check 1: Environment File
Write-Host "[1/8] Checking .env file..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "   ✅ .env file exists" -ForegroundColor Green
    
    # Check required variables
    $envContent = Get-Content ".env"
    $requiredVars = @("PORT", "VPS_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "INGEST_SECRET")
    $missingVars = @()
    
    foreach ($var in $requiredVars) {
        $found = $false
        foreach ($line in $envContent) {
            if ($line -match "^$var=") {
                $found = $true
                break
            }
        }
        if (-not $found) {
            $missingVars += $var
        }
    }
    
    if ($missingVars.Count -eq 0) {
        Write-Host "   ✅ All required environment variables found" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Missing variables: $($missingVars -join ', ')" -ForegroundColor Red
        $allChecksPassed = $false
    }
} else {
    Write-Host "   ❌ .env file not found" -ForegroundColor Red
    Write-Host "   💡 Run: Copy-Item .env.example .env" -ForegroundColor Yellow
    $allChecksPassed = $false
}

# Check 2: Node.js
Write-Host "[2/8] Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "   ✅ Node.js installed: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Node.js not found" -ForegroundColor Red
    $allChecksPassed = $false
}

# Check 3: PM2
Write-Host "[3/8] Checking PM2..." -ForegroundColor Yellow
try {
    $pm2Version = pm2 --version
    Write-Host "   ✅ PM2 installed: $pm2Version" -ForegroundColor Green
} catch {
    Write-Host "   ❌ PM2 not found" -ForegroundColor Red
    Write-Host "   💡 Install with: npm install -g pm2" -ForegroundColor Yellow
    $allChecksPassed = $false
}

# Check 4: Python
Write-Host "[4/8] Checking Python..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version
    Write-Host "   ✅ Python installed: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Python not found" -ForegroundColor Red
    $allChecksPassed = $false
}

# Check 5: MetaTrader5 Package
Write-Host "[5/8] Checking MetaTrader5 package..." -ForegroundColor Yellow
try {
    $mt5Check = python -c "import MetaTrader5; print('OK')" 2>$null
    if ($mt5Check -eq "OK") {
        Write-Host "   ✅ MetaTrader5 package installed" -ForegroundColor Green
    } else {
        throw "Not installed"
    }
} catch {
    Write-Host "   ❌ MetaTrader5 package not found" -ForegroundColor Red
    Write-Host "   💡 Install with: pip install MetaTrader5" -ForegroundColor Yellow
    $allChecksPassed = $false
}

# Check 6: TypeScript Build
Write-Host "[6/8] Checking TypeScript build..." -ForegroundColor Yellow
if (Test-Path "dist/index.js") {
    Write-Host "   ✅ TypeScript build exists" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  TypeScript not built yet" -ForegroundColor Yellow
    Write-Host "   💡 Run: npm run build" -ForegroundColor Yellow
}

# Check 7: PM2 Service Status
Write-Host "[7/8] Checking PM2 service status..." -ForegroundColor Yellow
try {
    $pm2Status = pm2 jlist 2>$null | ConvertFrom-Json
    $service = $pm2Status | Where-Object { $_.name -eq "imperial-trade-broker-service" }
    
    if ($service) {
        if ($service.pm2_env.status -eq "online") {
            Write-Host "   ✅ Service is running (status: online)" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  Service exists but not running (status: $($service.pm2_env.status))" -ForegroundColor Yellow
            Write-Host "   💡 Run: pm2 restart imperial-trade-broker-service" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   ⚠️  Service not started yet" -ForegroundColor Yellow
        Write-Host "   💡 Run: pm2 start ecosystem.config.js" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ⚠️  Could not check PM2 status" -ForegroundColor Yellow
}

# Check 8: Health Endpoint
Write-Host "[8/8] Checking health endpoint..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 5 -UseBasicParsing 2>$null
    if ($healthResponse.StatusCode -eq 200) {
        Write-Host "   ✅ Health endpoint responding" -ForegroundColor Green
        $healthData = $healthResponse.Content | ConvertFrom-Json
        Write-Host "      Status: $($healthData.status)" -ForegroundColor Gray
        Write-Host "      Uptime: $([math]::Round($healthData.uptime, 2)) seconds" -ForegroundColor Gray
    } else {
        Write-Host "   ⚠️  Health endpoint returned status: $($healthResponse.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ⚠️  Health endpoint not accessible" -ForegroundColor Yellow
    Write-Host "      Service may not be running or port 3001 is not accessible" -ForegroundColor Gray
}

# Summary
Write-Host ""
if ($allChecksPassed) {
    Write-Host "✅ All critical checks passed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Ensure Generic MT5 Terminal is open and logged in" -ForegroundColor White
    Write-Host "2. Start service: pm2 start ecosystem.config.js" -ForegroundColor White
    Write-Host "3. Configure Supabase Edge Function secrets (see SUPABASE_EDGE_FUNCTION_SETUP.md)" -ForegroundColor White
    Write-Host "4. Test connection in Journal XX Pro" -ForegroundColor White
} else {
    Write-Host "❌ Some checks failed. Please fix the issues above." -ForegroundColor Red
    Write-Host ""
    Write-Host "Quick fixes:" -ForegroundColor Cyan
    Write-Host "- Missing .env: Copy-Item .env.example .env" -ForegroundColor White
    Write-Host "- Not built: npm run build" -ForegroundColor White
    Write-Host "- Start service: pm2 start ecosystem.config.js" -ForegroundColor White
}
Write-Host ""








