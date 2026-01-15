# ============================================================================
# MASTER SCRIPT - Run Everything on VPS
# ============================================================================
# This is a SINGLE script that does EVERYTHING:
# 1. Installs all runtime environments
# 2. Sets up watchdogs
# 3. Starts all services
# 4. Verifies everything
#
# Copy this ENTIRE file and paste into PowerShell on VPS (as Administrator)
# ============================================================================

# Check Administrator privileges
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "❌ ERROR: Must run as Administrator! Right-click PowerShell → Run as Administrator" -ForegroundColor Red
    pause
    exit 1
}

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  COMPLETE VPS SETUP - Trading App Infrastructure" -ForegroundColor Cyan
Write-Host "  This will install and configure everything" -ForegroundColor Gray
Write-Host "  Estimated time: 15-20 minutes" -ForegroundColor Gray
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# STEP 1: Install Chocolatey
# ============================================================================
Write-Host "[1/10] Installing Chocolatey..." -ForegroundColor Yellow
if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    $env:ChocolateyInstall = Convert-Path "$((Get-Command choco).Path)\..\.."
    Import-Module "$env:ChocolateyInstall\helpers\chocolateyProfile.psm1"
    refreshenv
    Write-Host "   ✅ Chocolatey installed" -ForegroundColor Green
} else {
    Write-Host "   ✅ Chocolatey already installed" -ForegroundColor Green
}
Start-Sleep -Seconds 2

# ============================================================================
# STEP 2: Install Node.js
# ============================================================================
Write-Host "[2/10] Installing Node.js LTS..." -ForegroundColor Yellow
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    choco install nodejs-lts -y | Out-Null
    refreshenv
    Write-Host "   ✅ Node.js installed" -ForegroundColor Green
} else {
    Write-Host "   ✅ Node.js already installed: $(node --version)" -ForegroundColor Green
}
Start-Sleep -Seconds 2

# ============================================================================
# STEP 3: Install Python 3
# ============================================================================
Write-Host "[3/10] Installing Python 3..." -ForegroundColor Yellow
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    choco install python3 -y | Out-Null
    refreshenv
    Write-Host "   ✅ Python 3 installed" -ForegroundColor Green
} else {
    Write-Host "   ✅ Python already installed: $(python --version)" -ForegroundColor Green
}

# Install Python packages
Write-Host "   Installing Python packages (MetaTrader5, requests, python-dotenv)..." -ForegroundColor Gray
python -m pip install --upgrade pip --quiet | Out-Null
python -m pip install MetaTrader5 requests python-dotenv --quiet | Out-Null
Write-Host "   ✅ Python packages installed" -ForegroundColor Green
Start-Sleep -Seconds 2

# ============================================================================
# STEP 4: Install Deno
# ============================================================================
Write-Host "[4/10] Installing Deno..." -ForegroundColor Yellow
if (-not (Get-Command deno -ErrorAction SilentlyContinue)) {
    irm https://deno.land/install.ps1 | iex
    $denoPath = "$env:USERPROFILE\.deno\bin"
    if ($env:PATH -notlike "*$denoPath*") {
        [Environment]::SetEnvironmentVariable("Path", "$env:Path;$denoPath", [EnvironmentVariableTarget]::Machine)
        $env:Path += ";$denoPath"
    }
    Write-Host "   ✅ Deno installed" -ForegroundColor Green
} else {
    Write-Host "   ✅ Deno already installed" -ForegroundColor Green
}
Start-Sleep -Seconds 2

# ============================================================================
# STEP 5: Install PM2
# ============================================================================
Write-Host "[5/10] Installing PM2 Process Manager..." -ForegroundColor Yellow
if (-not (Get-Command pm2 -ErrorAction SilentlyContinue)) {
    npm install -g pm2 | Out-Null
    Write-Host "   ✅ PM2 installed" -ForegroundColor Green
} else {
    Write-Host "   ✅ PM2 already installed: v$(pm2 --version)" -ForegroundColor Green
}

# Setup PM2 startup
Write-Host "   Configuring PM2 startup..." -ForegroundColor Gray
pm2 startup | Out-Null
Write-Host "   ✅ PM2 startup configured" -ForegroundColor Green
Start-Sleep -Seconds 2

# ============================================================================
# STEP 6: Install Git
# ============================================================================
Write-Host "[6/10] Installing Git..." -ForegroundColor Yellow
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    choco install git -y | Out-Null
    refreshenv
    Write-Host "   ✅ Git installed" -ForegroundColor Green
} else {
    Write-Host "   ✅ Git already installed" -ForegroundColor Green
}
Start-Sleep -Seconds 2

# ============================================================================
# STEP 7: Create Watchdog Directory and Scripts
# ============================================================================
Write-Host "[7/10] Creating Watchdog Scripts..." -ForegroundColor Yellow

$watchdogDir = "C:\imperial-watchdogs"
if (-not (Test-Path $watchdogDir)) {
    New-Item -ItemType Directory -Path $watchdogDir -Force | Out-Null
}

# Price Feeder Watchdog
$priceFeederWatchdog = @'
// Price Feeder Watchdog - Ensures service NEVER dies
const pm2 = require('pm2');
const { execSync } = require('child_process');

const SERVICE_NAME = 'Imperial Price Feeder';
const CHECK_INTERVAL = 10000; // Check every 10 seconds

function checkService() {
    pm2.list((err, list) => {
        if (err) {
            console.error('[WATCHDOG] PM2 Error:', err);
            setTimeout(checkService, CHECK_INTERVAL);
            return;
        }

        const service = list.find(p => p.name === SERVICE_NAME);
        
        if (!service) {
            console.log(`[WATCHDOG] ${SERVICE_NAME} NOT FOUND - Starting...`);
            const ecosystemPath = 'C:\\imperial-price-feeder\\pm2-ecosystem.config.js';
            if (require('fs').existsSync(ecosystemPath)) {
                pm2.start(ecosystemPath, { name: SERVICE_NAME }, () => {
                    setTimeout(checkService, CHECK_INTERVAL);
                });
            } else {
                console.error(`[WATCHDOG] Ecosystem file not found: ${ecosystemPath}`);
                setTimeout(checkService, CHECK_INTERVAL);
            }
        } else if (service.pm2_env.status !== 'online') {
            console.log(`[WATCHDOG] ${SERVICE_NAME} is ${service.pm2_env.status} - Restarting...`);
            pm2.restart(SERVICE_NAME, (err) => {
                if (err) {
                    console.error(`[WATCHDOG] Failed to restart:`, err);
                    pm2.delete(SERVICE_NAME, () => {
                        setTimeout(checkService, CHECK_INTERVAL);
                    });
                } else {
                    console.log(`[WATCHDOG] ✅ ${SERVICE_NAME} restarted`);
                    setTimeout(checkService, CHECK_INTERVAL);
                }
            });
        } else {
            setTimeout(checkService, CHECK_INTERVAL);
        }
    });
}

console.log(`[WATCHDOG] Starting ${SERVICE_NAME} watchdog (check interval: ${CHECK_INTERVAL/1000}s)`);
pm2.connect((err) => {
    if (err) {
        console.error('[WATCHDOG] Failed to connect to PM2:', err);
        process.exit(1);
    }
    checkService();
});

process.on('SIGINT', () => {
    pm2.disconnect();
    process.exit(0);
});
'@

Set-Content -Path "$watchdogDir\price-feeder-watchdog.js" -Value $priceFeederWatchdog -Force

# MT5 Watchdog
$mt5Watchdog = @'
// EC Markets MT5 Watchdog - Ensures MT5 NEVER closes
const { exec, spawn } = require('child_process');

const MT5_PATH = 'C:\\Program Files\\EC Markets MetaTrader 5\\terminal64.exe';
const CHECK_INTERVAL = 15000; // Check every 15 seconds
const RESTART_DELAY = 5000; // Wait 5 seconds before restart

function checkMT5() {
    exec('powershell -Command "Get-Process -Name terminal64 -ErrorAction SilentlyContinue | Where-Object { $_.Path -like \'*EC Markets*\' }"', (error, stdout, stderr) => {
        if (stdout.trim()) {
            console.log(`[MT5-WATCHDOG] ✅ EC Markets MT5 is running`);
        } else {
            console.log(`[MT5-WATCHDOG] ❌ EC Markets MT5 not found - Starting...`);
            setTimeout(() => {
                const fs = require('fs');
                if (fs.existsSync(MT5_PATH)) {
                    const mt5 = spawn(MT5_PATH, [], {
                        detached: true,
                        stdio: 'ignore'
                    });
                    mt5.unref();
                    console.log(`[MT5-WATCHDOG] ✅ EC Markets MT5 started (PID: ${mt5.pid})`);
                } else {
                    console.error(`[MT5-WATCHDOG] ❌ MT5 not found at: ${MT5_PATH}`);
                }
            }, RESTART_DELAY);
        }
        setTimeout(checkMT5, CHECK_INTERVAL);
    });
}

console.log('[MT5-WATCHDOG] Starting EC Markets MT5 watchdog (check interval: 15s)');
checkMT5();
'@

Set-Content -Path "$watchdogDir\mt5-watchdog.js" -Value $mt5Watchdog -Force

# Install watchdog dependencies
Set-Location $watchdogDir
if (-not (Test-Path "package.json")) {
    npm init -y | Out-Null
}
npm install pm2 --save --quiet | Out-Null
Set-Location $env:USERPROFILE

Write-Host "   ✅ Watchdog scripts created" -ForegroundColor Green
Start-Sleep -Seconds 2

# ============================================================================
# STEP 8: Setup Price Feeder PM2 Configuration
# ============================================================================
Write-Host "[8/10] Setting up Price Feeder PM2 Configuration..." -ForegroundColor Yellow

$priceFeederPath = "C:\imperial-price-feeder"
if (Test-Path $priceFeederPath) {
    # Create logs directory
    $logsDir = "$priceFeederPath\logs"
    if (-not (Test-Path $logsDir)) {
        New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
    }
    
    # Create PM2 ecosystem file
    $ecosystemContent = @"
module.exports = {
  apps: [
    {
      name: 'Imperial Price Feeder',
      script: './dist/index.js',
      cwd: 'C:\\imperial-price-feeder',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production'
      },
      error_file: 'C:\\imperial-price-feeder\\logs\\error.log',
      out_file: 'C:\\imperial-price-feeder\\logs\\out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      time: true,
      restart_delay: 5000,
      max_restarts: 999999,
      min_uptime: '10s',
      listen_timeout: 10000,
      kill_timeout: 5000
    }
  ]
};
"@
    
    Set-Content -Path "$priceFeederPath\pm2-ecosystem.config.js" -Value $ecosystemContent -Force
    Write-Host "   ✅ PM2 ecosystem file created" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Price feeder directory not found: $priceFeederPath" -ForegroundColor Yellow
    Write-Host "   ⚠️  You may need to create this directory and install the price feeder" -ForegroundColor Yellow
}
Start-Sleep -Seconds 2

# ============================================================================
# STEP 9: Start EC Markets MT5 (if not running)
# ============================================================================
Write-Host "[9/10] Starting EC Markets MT5..." -ForegroundColor Yellow

$mt5Process = Get-Process -Name "terminal64" -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*EC Markets*" }
if (-not $mt5Process) {
    $mt5Path = "C:\Program Files\EC Markets MetaTrader 5\terminal64.exe"
    if (Test-Path $mt5Path) {
        Start-Process $mt5Path
        Start-Sleep -Seconds 5
        Write-Host "   ✅ EC Markets MT5 started" -ForegroundColor Green
    } else {
        Write-Host "   ❌ EC Markets MT5 not found at: $mt5Path" -ForegroundColor Red
        Write-Host "   ⚠️  Please install EC Markets MT5 manually" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ✅ EC Markets MT5 already running (PID: $($mt5Process.Id))" -ForegroundColor Green
}
Start-Sleep -Seconds 2

# ============================================================================
# STEP 10: Start All PM2 Services
# ============================================================================
Write-Host "[10/10] Starting All PM2 Services..." -ForegroundColor Yellow

# Connect to PM2
pm2 connect | Out-Null

# Start MT5 Watchdog
$mt5WatchdogRunning = pm2 list | Select-String "MT5 Watchdog"
if (-not $mt5WatchdogRunning) {
    $watchdogPath = "C:\imperial-watchdogs\mt5-watchdog.js"
    if (Test-Path $watchdogPath) {
        pm2 start $watchdogPath --name "MT5 Watchdog" --autorestart --max-restarts 999999 --min-uptime "5s" | Out-Null
        Write-Host "   ✅ MT5 Watchdog started" -ForegroundColor Green
    }
} else {
    Write-Host "   ✅ MT5 Watchdog already running" -ForegroundColor Green
}

# Start Price Feeder (if directory exists)
$priceFeederRunning = pm2 list | Select-String "Imperial Price Feeder"
if (-not $priceFeederRunning) {
    if (Test-Path "$priceFeederPath\pm2-ecosystem.config.js") {
        pm2 start "$priceFeederPath\pm2-ecosystem.config.js" | Out-Null
        Write-Host "   ✅ Price Feeder started" -ForegroundColor Green
    } elseif (Test-Path "$priceFeederPath\dist\index.js") {
        pm2 start "$priceFeederPath\dist\index.js" --name "Imperial Price Feeder" --cwd $priceFeederPath --autorestart --max-restarts 999999 --min-uptime "10s" --restart-delay 5000 | Out-Null
        Write-Host "   ✅ Price Feeder started" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Price Feeder files not found - skipping" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ✅ Price Feeder already running" -ForegroundColor Green
}

# Start Price Feeder Watchdog
$priceFeederWatchdogRunning = pm2 list | Select-String "Price Feeder Watchdog"
if (-not $priceFeederWatchdogRunning) {
    $watchdogPath = "C:\imperial-watchdogs\price-feeder-watchdog.js"
    if (Test-Path $watchdogPath) {
        pm2 start $watchdogPath --name "Price Feeder Watchdog" --autorestart --max-restarts 999999 --min-uptime "5s" | Out-Null
        Write-Host "   ✅ Price Feeder Watchdog started" -ForegroundColor Green
    }
} else {
    Write-Host "   ✅ Price Feeder Watchdog already running" -ForegroundColor Green
}

# Save PM2 configuration
pm2 save | Out-Null
Write-Host "   ✅ PM2 configuration saved (auto-start on boot)" -ForegroundColor Green

Write-Host ""

# ============================================================================
# VERIFICATION
# ============================================================================
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  VERIFICATION" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Check runtime environments
Write-Host "Runtime Environments:" -ForegroundColor Yellow
if (Get-Command node -ErrorAction SilentlyContinue) {
    Write-Host "   ✅ Node.js: $(node --version)" -ForegroundColor Green
} else {
    Write-Host "   ❌ Node.js: NOT FOUND" -ForegroundColor Red
}

if (Get-Command python -ErrorAction SilentlyContinue) {
    Write-Host "   ✅ Python: $(python --version)" -ForegroundColor Green
} else {
    Write-Host "   ❌ Python: NOT FOUND" -ForegroundColor Red
}

if (Get-Command deno -ErrorAction SilentlyContinue) {
    Write-Host "   ✅ Deno: Installed" -ForegroundColor Green
} else {
    Write-Host "   ❌ Deno: NOT FOUND" -ForegroundColor Red
}

if (Get-Command pm2 -ErrorAction SilentlyContinue) {
    Write-Host "   ✅ PM2: v$(pm2 --version)" -ForegroundColor Green
} else {
    Write-Host "   ❌ PM2: NOT FOUND" -ForegroundColor Red
}

Write-Host ""

# Check PM2 Services
Write-Host "PM2 Services:" -ForegroundColor Yellow
pm2 list

Write-Host ""

# Check MT5 Process
Write-Host "MT5 Process:" -ForegroundColor Yellow
$mt5Process = Get-Process -Name "terminal64" -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*EC Markets*" }
if ($mt5Process) {
    Write-Host "   ✅ EC Markets MT5: RUNNING (PID: $($mt5Process.Id))" -ForegroundColor Green
} else {
    Write-Host "   ❌ EC Markets MT5: NOT RUNNING" -ForegroundColor Red
}

Write-Host ""

# ============================================================================
# FINAL SUMMARY
# ============================================================================
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  ✅ SETUP COMPLETE!" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Verify Price Feeder .env file exists at:" -ForegroundColor White
Write-Host "     C:\imperial-price-feeder\.env" -ForegroundColor Gray
Write-Host "     Should contain: INGEST_SECRET=ImperialTrade_IngestSecret_2025_v1" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Check PM2 services:" -ForegroundColor White
Write-Host "     pm2 list" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. View logs:" -ForegroundColor White
Write-Host "     pm2 logs 'Imperial Price Feeder' --lines 50" -ForegroundColor Gray
Write-Host ""
Write-Host "  4. Monitor resources:" -ForegroundColor White
Write-Host "     pm2 monit" -ForegroundColor Gray
Write-Host ""
Write-Host "✅ Services will auto-start on boot and NEVER die!" -ForegroundColor Green
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")




