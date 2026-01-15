# ============================================================================
# COMPLETE SYSTEM VERIFICATION
# ============================================================================
# Verifies all runtime environments, services, and configurations are correct
# ============================================================================

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  COMPLETE SYSTEM VERIFICATION" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

$allGood = $true

# ============================================================================
# Check Runtime Environments
# ============================================================================
Write-Host "1. RUNTIME ENVIRONMENTS:" -ForegroundColor Yellow

# Node.js
if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeVersion = node --version
    Write-Host "   ✅ Node.js: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "   ❌ Node.js: NOT INSTALLED" -ForegroundColor Red
    $allGood = $false
}

# npm
if (Get-Command npm -ErrorAction SilentlyContinue) {
    $npmVersion = npm --version
    Write-Host "   ✅ npm: v$npmVersion" -ForegroundColor Green
} else {
    Write-Host "   ❌ npm: NOT INSTALLED" -ForegroundColor Red
    $allGood = $false
}

# Python
if (Get-Command python -ErrorAction SilentlyContinue) {
    $pythonVersion = python --version
    Write-Host "   ✅ Python: $pythonVersion" -ForegroundColor Green
    
    # Check MetaTrader5 package
    $mt5Check = python -c "import MetaTrader5; print('OK')" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ MetaTrader5 package: Installed" -ForegroundColor Green
    } else {
        Write-Host "   ❌ MetaTrader5 package: NOT INSTALLED" -ForegroundColor Red
        $allGood = $false
    }
} else {
    Write-Host "   ❌ Python: NOT INSTALLED" -ForegroundColor Red
    $allGood = $false
}

# Deno
if (Get-Command deno -ErrorAction SilentlyContinue) {
    $denoVersion = (deno --version).Split("`n")[0]
    Write-Host "   ✅ Deno: $denoVersion" -ForegroundColor Green
} else {
    Write-Host "   ❌ Deno: NOT INSTALLED" -ForegroundColor Red
    $allGood = $false
}

# PM2
if (Get-Command pm2 -ErrorAction SilentlyContinue) {
    $pm2Version = pm2 --version
    Write-Host "   ✅ PM2: v$pm2Version" -ForegroundColor Green
} else {
    Write-Host "   ❌ PM2: NOT INSTALLED" -ForegroundColor Red
    $allGood = $false
}

Write-Host ""

# ============================================================================
# Check MT5 Installation
# ============================================================================
Write-Host "2. MT5 INSTALLATION:" -ForegroundColor Yellow

$ecMarketsPath = "C:\Program Files\EC Markets MetaTrader 5\terminal64.exe"
if (Test-Path $ecMarketsPath) {
    Write-Host "   ✅ EC Markets MT5: Found" -ForegroundColor Green
} else {
    Write-Host "   ❌ EC Markets MT5: NOT FOUND" -ForegroundColor Red
    Write-Host "      Expected: $ecMarketsPath" -ForegroundColor Gray
    $allGood = $false
}

Write-Host ""

# ============================================================================
# Check MT5 Process
# ============================================================================
Write-Host "3. MT5 PROCESS:" -ForegroundColor Yellow

$mt5Process = Get-Process -Name "terminal64" -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*EC Markets*" }
if ($mt5Process) {
    Write-Host "   ✅ EC Markets MT5: RUNNING (PID: $($mt5Process.Id))" -ForegroundColor Green
    $uptime = (Get-Date) - $mt5Process.StartTime
    Write-Host "      Uptime: $($uptime.Hours)h $($uptime.Minutes)m" -ForegroundColor Gray
} else {
    Write-Host "   ❌ EC Markets MT5: NOT RUNNING" -ForegroundColor Red
    $allGood = $false
}

Write-Host ""

# ============================================================================
# Check PM2 Services
# ============================================================================
Write-Host "4. PM2 SERVICES:" -ForegroundColor Yellow

pm2 connect | Out-Null
$pm2List = pm2 list

if ($pm2List | Select-String "Imperial Price Feeder") {
    $status = pm2 jlist | ConvertFrom-Json | Where-Object { $_.name -eq "Imperial Price Feeder" }
    if ($status.pm2_env.status -eq "online") {
        Write-Host "   ✅ Imperial Price Feeder: ONLINE" -ForegroundColor Green
        Write-Host "      Uptime: $($status.pm2_env.pm_uptime)" -ForegroundColor Gray
        Write-Host "      Restarts: $($status.pm2_env.restart_time)" -ForegroundColor Gray
    } else {
        Write-Host "   ❌ Imperial Price Feeder: $($status.pm2_env.status)" -ForegroundColor Red
        $allGood = $false
    }
} else {
    Write-Host "   ❌ Imperial Price Feeder: NOT FOUND IN PM2" -ForegroundColor Red
    $allGood = $false
}

if ($pm2List | Select-String "Price Feeder Watchdog") {
    $status = pm2 jlist | ConvertFrom-Json | Where-Object { $_.name -eq "Price Feeder Watchdog" }
    if ($status.pm2_env.status -eq "online") {
        Write-Host "   ✅ Price Feeder Watchdog: ONLINE" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Price Feeder Watchdog: $($status.pm2_env.status)" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ⚠️  Price Feeder Watchdog: NOT FOUND IN PM2" -ForegroundColor Yellow
}

if ($pm2List | Select-String "MT5 Watchdog") {
    $status = pm2 jlist | ConvertFrom-Json | Where-Object { $_.name -eq "MT5 Watchdog" }
    if ($status.pm2_env.status -eq "online") {
        Write-Host "   ✅ MT5 Watchdog: ONLINE" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  MT5 Watchdog: $($status.pm2_env.status)" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ⚠️  MT5 Watchdog: NOT FOUND IN PM2" -ForegroundColor Yellow
}

Write-Host ""

# ============================================================================
# Check Price Feeder Configuration
# ============================================================================
Write-Host "5. PRICE FEEDER CONFIGURATION:" -ForegroundColor Yellow

$priceFeederPath = "C:\imperial-price-feeder"
if (Test-Path $priceFeederPath) {
    Write-Host "   ✅ Price Feeder Directory: Found" -ForegroundColor Green
    
    $envPath = "$priceFeederPath\.env"
    if (Test-Path $envPath) {
        Write-Host "   ✅ .env File: Found" -ForegroundColor Green
        
        $envContent = Get-Content $envPath
        $ingestSecret = ($envContent | Select-String "INGEST_SECRET=") -replace "INGEST_SECRET=", ""
        
        if ($ingestSecret -eq "ImperialTrade_IngestSecret_2025_v1") {
            Write-Host "   ✅ INGEST_SECRET: Matches" -ForegroundColor Green
        } else {
            Write-Host "   ❌ INGEST_SECRET: MISMATCH" -ForegroundColor Red
            Write-Host "      Expected: ImperialTrade_IngestSecret_2025_v1" -ForegroundColor Gray
            Write-Host "      Found: $ingestSecret" -ForegroundColor Gray
            $allGood = $false
        }
        
        $supabaseUrl = ($envContent | Select-String "SUPABASE_FUNCTION_URL=") -replace "SUPABASE_FUNCTION_URL=", ""
        if ($supabaseUrl) {
            Write-Host "   ✅ SUPABASE_FUNCTION_URL: Configured" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  SUPABASE_FUNCTION_URL: Not configured" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   ❌ .env File: NOT FOUND" -ForegroundColor Red
        $allGood = $false
    }
} else {
    Write-Host "   ❌ Price Feeder Directory: NOT FOUND" -ForegroundColor Red
    Write-Host "      Expected: $priceFeederPath" -ForegroundColor Gray
    $allGood = $false
}

Write-Host ""

# ============================================================================
# Check Network Connectivity
# ============================================================================
Write-Host "6. NETWORK CONNECTIVITY:" -ForegroundColor Yellow

$supabaseUrl = "https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/price-ingestor"
try {
    $response = Invoke-WebRequest -Uri $supabaseUrl -Method OPTIONS -TimeoutSec 5 -ErrorAction Stop
    Write-Host "   ✅ Supabase Reachable (Status: $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Supabase Not Reachable: $($_.Exception.Message)" -ForegroundColor Red
    $allGood = $false
}

Write-Host ""

# ============================================================================
# Summary
# ============================================================================
Write-Host "================================================================" -ForegroundColor Cyan
if ($allGood) {
    Write-Host "  ✅ ALL CHECKS PASSED - System is ready!" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  SOME CHECKS FAILED - Review errors above" -ForegroundColor Yellow
}
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""




