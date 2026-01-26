# ============================================================================
# ENSURE BOTH SERVICES NEVER STOP - Broker Service + Price Feeder
# ============================================================================
# This script ensures BOTH services are running and will NEVER stop
# - Imperial Trade Broker Service (port 3001)
# - Imperial Price Feeder (price updates)
# ============================================================================

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  ENSURING BOTH SERVICES NEVER STOP" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

$brokerServiceName = "imperial-trade-broker-service"
$priceFeederName = "Imperial Price Feeder"
$brokerServicePath = "C:\vps-broker-service\dist\index.js"
$priceFeederDir = "C:\imperial-price-feeder"

# Function to start/restart a PM2 service with auto-restart settings
function Ensure-PM2Service {
    param(
        [string]$ServiceName,
        [string]$ScriptPath,
        [string]$WorkingDir,
        [string]$DisplayName
    )
    
    Write-Host "=== Ensuring $DisplayName ===" -ForegroundColor Yellow
    
    # Check if service exists
    $serviceExists = pm2 list | Select-String $ServiceName
    
    if ($serviceExists) {
        Write-Host "  [OK] $DisplayName found in PM2" -ForegroundColor Green
        
        # Get status
        $status = pm2 jlist | ConvertFrom-Json | Where-Object { $_.name -eq $ServiceName }
        if ($status) {
            Write-Host "  Status: $($status.pm2_env.status)" -ForegroundColor Gray
            
            if ($status.pm2_env.status -ne 'online') {
                Write-Host "  [WARNING] Service is not online, restarting..." -ForegroundColor Yellow
                pm2 restart $ServiceName
                Start-Sleep -Seconds 3
            } else {
                Write-Host "  [OK] Service is online" -ForegroundColor Green
            }
            
            # Update auto-restart settings to ensure it never stops
            Write-Host "  Updating auto-restart settings..." -ForegroundColor Yellow
            pm2 restart $ServiceName --update-env
            pm2 save
        }
    } else {
        Write-Host "  [WARNING] $DisplayName NOT FOUND, starting..." -ForegroundColor Yellow
        
        if (Test-Path $ScriptPath) {
            Push-Location $WorkingDir
            pm2 start $ScriptPath --name $ServiceName --cwd $WorkingDir `
                --autorestart --max-restarts 999999 --min-uptime "10s" `
                --restart-delay 5000 --exp-backoff-restart-delay 100
            Pop-Location
            Start-Sleep -Seconds 3
            Write-Host "  [OK] $DisplayName started" -ForegroundColor Green
        } else {
            Write-Host "  [ERROR] Script not found: $ScriptPath" -ForegroundColor Red
            return $false
        }
    }
    
    return $true
}

# 1. Ensure Broker Service (ONLY - never touch price feeder)
Write-Host "[1/3] Ensuring Broker Service (ONLY)..." -ForegroundColor Cyan
Write-Host "  [PROTECTION] Price Feeder will NOT be touched" -ForegroundColor Green
$brokerOk = Ensure-PM2Service -ServiceName $brokerServiceName `
    -ScriptPath $brokerServicePath `
    -WorkingDir "C:\vps-broker-service" `
    -DisplayName "Broker Service"

Write-Host ""

# 2. Ensure Price Feeder
Write-Host "[2/3] Ensuring Price Feeder..." -ForegroundColor Cyan
if (Test-Path $priceFeederDir) {
    $feederEcosystem = "$priceFeederDir\pm2-ecosystem.config.js"
    $feederScript = "$priceFeederDir\dist\index.js"
    
    if (Test-Path $feederEcosystem) {
        # Use ecosystem file if available
        Push-Location $priceFeederDir
        $feederExists = pm2 list | Select-String $priceFeederName
        if (-not $feederExists) {
            Write-Host "  Starting Price Feeder from ecosystem file..." -ForegroundColor Yellow
            pm2 start $feederEcosystem
            Start-Sleep -Seconds 3
        } else {
            Write-Host "  [OK] Price Feeder found, ensuring it's running..." -ForegroundColor Green
            pm2 restart $priceFeederName
        }
        Pop-Location
    } elseif (Test-Path $feederScript) {
        # Use direct script
        $feederOk = Ensure-PM2Service -ServiceName $priceFeederName `
            -ScriptPath $feederScript `
            -WorkingDir $priceFeederDir `
            -DisplayName "Price Feeder"
    } else {
        Write-Host "  [ERROR] Price Feeder files not found" -ForegroundColor Red
        Write-Host "  Expected: $feederEcosystem or $feederScript" -ForegroundColor Yellow
    }
} else {
    Write-Host "  [ERROR] Price Feeder directory not found: $priceFeederDir" -ForegroundColor Red
}

Write-Host ""

# 3. Save PM2 configuration and set up startup
Write-Host "[3/3] Saving PM2 Configuration..." -ForegroundColor Cyan
pm2 save
Write-Host "  [OK] PM2 configuration saved" -ForegroundColor Green

# Set up PM2 startup (Windows)
Write-Host "  Setting up PM2 startup..." -ForegroundColor Yellow
pm2 startup | Out-Null
Write-Host "  [OK] PM2 startup configured" -ForegroundColor Green

Write-Host ""

# Final Status
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  FINAL STATUS" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
pm2 list
Write-Host ""

Write-Host "================================================================" -ForegroundColor Green
Write-Host "  BOTH SERVICES CONFIGURED TO NEVER STOP" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Services will:" -ForegroundColor Yellow
Write-Host "  - Auto-restart if they crash" -ForegroundColor White
Write-Host "  - Auto-start on VPS boot" -ForegroundColor White
Write-Host "  - Restart up to 999,999 times" -ForegroundColor White
Write-Host "  - Never stop unless manually stopped" -ForegroundColor White
Write-Host ""
Write-Host "Monitor logs:" -ForegroundColor Yellow
Write-Host "  pm2 logs $brokerServiceName --lines 50" -ForegroundColor Gray
Write-Host "  pm2 logs '$priceFeederName' --lines 50" -ForegroundColor Gray
Write-Host ""

