# ============================================================================
# COMPLETE VPS SETUP SCRIPT - Trading App Infrastructure
# ============================================================================
# This script installs all required runtime environments, process managers,
# and sets up auto-restart/startup configuration for the trading app.
# 
# VPS Details:
#   IP: 45.32.89.134
#   Username: Administrator
#   Password: 2#bWj}tv=}5d}u5}
#
# Run this script as Administrator on the VPS
# ============================================================================

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  COMPLETE VPS SETUP - Trading App Infrastructure" -ForegroundColor Cyan
Write-Host "  Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "❌ ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "   Right-click PowerShell → Run as Administrator" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Running as Administrator" -ForegroundColor Green
Write-Host ""

# ============================================================================
# STEP 1: Install Chocolatey (Windows Package Manager)
# ============================================================================
Write-Host "STEP 1: Installing Chocolatey..." -ForegroundColor Yellow

if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {
    Write-Host "   Installing Chocolatey..." -ForegroundColor Gray
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    
    # Refresh environment variables
    $env:ChocolateyInstall = Convert-Path "$((Get-Command choco).Path)\..\.."
    Import-Module "$env:ChocolateyInstall\helpers\chocolateyProfile.psm1"
    refreshenv
    
    Write-Host "   ✅ Chocolatey installed" -ForegroundColor Green
} else {
    Write-Host "   ✅ Chocolatey already installed" -ForegroundColor Green
}

Write-Host ""

# ============================================================================
# STEP 2: Install Node.js and npm
# ============================================================================
Write-Host "STEP 2: Installing Node.js..." -ForegroundColor Yellow

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "   Installing Node.js LTS..." -ForegroundColor Gray
    choco install nodejs-lts -y
    
    # Refresh environment
    refreshenv
    
    Write-Host "   ✅ Node.js installed" -ForegroundColor Green
} else {
    $nodeVersion = node --version
    Write-Host "   ✅ Node.js already installed: $nodeVersion" -ForegroundColor Green
}

# Verify npm
if (Get-Command npm -ErrorAction SilentlyContinue) {
    $npmVersion = npm --version
    Write-Host "   ✅ npm installed: v$npmVersion" -ForegroundColor Green
}

Write-Host ""

# ============================================================================
# STEP 3: Install Python 3
# ============================================================================
Write-Host "STEP 3: Installing Python 3..." -ForegroundColor Yellow

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "   Installing Python 3..." -ForegroundColor Gray
    choco install python3 -y
    
    # Refresh environment
    refreshenv
    
    Write-Host "   ✅ Python 3 installed" -ForegroundColor Green
} else {
    $pythonVersion = python --version
    Write-Host "   ✅ Python already installed: $pythonVersion" -ForegroundColor Green
}

# Install pip if not present
if (-not (Get-Command pip -ErrorAction SilentlyContinue)) {
    python -m ensurepip --upgrade
    Write-Host "   ✅ pip installed" -ForegroundColor Green
}

# Install required Python packages for MT5 trading
Write-Host "   Installing Python packages for MT5..." -ForegroundColor Gray
pip install MetaTrader5 --upgrade --quiet
pip install requests --upgrade --quiet
pip install python-dotenv --upgrade --quiet

Write-Host "   ✅ Python packages installed" -ForegroundColor Green
Write-Host ""

# ============================================================================
# STEP 4: Install Deno
# ============================================================================
Write-Host "STEP 4: Installing Deno..." -ForegroundColor Yellow

if (-not (Get-Command deno -ErrorAction SilentlyContinue)) {
    Write-Host "   Installing Deno..." -ForegroundColor Gray
    irm https://deno.land/install.ps1 | iex
    
    # Add Deno to PATH
    $denoPath = "$env:USERPROFILE\.deno\bin"
    if ($env:PATH -notlike "*$denoPath*") {
        [Environment]::SetEnvironmentVariable("Path", "$env:Path;$denoPath", [EnvironmentVariableTarget]::Machine)
        $env:Path += ";$denoPath"
    }
    
    Write-Host "   ✅ Deno installed" -ForegroundColor Green
} else {
    $denoVersion = deno --version
    Write-Host "   ✅ Deno already installed: $denoVersion" -ForegroundColor Green
}

Write-Host ""

# ============================================================================
# STEP 5: Install PM2 Process Manager
# ============================================================================
Write-Host "STEP 5: Installing PM2 Process Manager..." -ForegroundColor Yellow

if (-not (Get-Command pm2 -ErrorAction SilentlyContinue)) {
    Write-Host "   Installing PM2 globally..." -ForegroundColor Gray
    npm install -g pm2
    
    # Setup PM2 startup script
    pm2 startup
    Write-Host "   ✅ PM2 installed and startup configured" -ForegroundColor Green
} else {
    $pm2Version = pm2 --version
    Write-Host "   ✅ PM2 already installed: v$pm2Version" -ForegroundColor Green
    
    # Update startup script
    pm2 startup
    Write-Host "   ✅ PM2 startup script updated" -ForegroundColor Green
}

Write-Host ""

# ============================================================================
# STEP 6: Install Git (if needed)
# ============================================================================
Write-Host "STEP 6: Installing Git..." -ForegroundColor Yellow

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "   Installing Git..." -ForegroundColor Gray
    choco install git -y
    refreshenv
    Write-Host "   ✅ Git installed" -ForegroundColor Green
} else {
    $gitVersion = git --version
    Write-Host "   ✅ Git already installed: $gitVersion" -ForegroundColor Green
}

Write-Host ""

# ============================================================================
# STEP 7: Verify Installations
# ============================================================================
Write-Host "STEP 7: Verifying Installations..." -ForegroundColor Yellow
Write-Host ""

$allInstalled = $true

# Check Node.js
if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeVersion = node --version
    Write-Host "   ✅ Node.js: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "   ❌ Node.js: NOT INSTALLED" -ForegroundColor Red
    $allInstalled = $false
}

# Check npm
if (Get-Command npm -ErrorAction SilentlyContinue) {
    $npmVersion = npm --version
    Write-Host "   ✅ npm: v$npmVersion" -ForegroundColor Green
} else {
    Write-Host "   ❌ npm: NOT INSTALLED" -ForegroundColor Red
    $allInstalled = $false
}

# Check Python
if (Get-Command python -ErrorAction SilentlyContinue) {
    $pythonVersion = python --version
    Write-Host "   ✅ Python: $pythonVersion" -ForegroundColor Green
} else {
    Write-Host "   ❌ Python: NOT INSTALLED" -ForegroundColor Red
    $allInstalled = $false
}

# Check pip
if (Get-Command pip -ErrorAction SilentlyContinue) {
    $pipVersion = pip --version
    Write-Host "   ✅ pip: Installed" -ForegroundColor Green
} else {
    Write-Host "   ❌ pip: NOT INSTALLED" -ForegroundColor Red
    $allInstalled = $false
}

# Check Deno
if (Get-Command deno -ErrorAction SilentlyContinue) {
    $denoVersion = (deno --version).Split("`n")[0]
    Write-Host "   ✅ Deno: $denoVersion" -ForegroundColor Green
} else {
    Write-Host "   ❌ Deno: NOT INSTALLED" -ForegroundColor Red
    $allInstalled = $false
}

# Check PM2
if (Get-Command pm2 -ErrorAction SilentlyContinue) {
    $pm2Version = pm2 --version
    Write-Host "   ✅ PM2: v$pm2Version" -ForegroundColor Green
} else {
    Write-Host "   ❌ PM2: NOT INSTALLED" -ForegroundColor Red
    $allInstalled = $false
}

# Check Git
if (Get-Command git -ErrorAction SilentlyContinue) {
    $gitVersion = git --version
    Write-Host "   ✅ Git: $gitVersion" -ForegroundColor Green
} else {
    Write-Host "   ❌ Git: NOT INSTALLED" -ForegroundColor Red
    $allInstalled = $false
}

Write-Host ""

# ============================================================================
# STEP 8: Setup PM2 Configuration for Auto-Restart
# ============================================================================
Write-Host "STEP 8: Configuring PM2 for Auto-Restart..." -ForegroundColor Yellow

# Create PM2 ecosystem file for price feeder
$pm2EcosystemPath = "C:\imperial-price-feeder\pm2-ecosystem.config.js"
if (Test-Path "C:\imperial-price-feeder") {
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
      max_restarts: 50,
      min_uptime: '10s',
      listen_timeout: 10000,
      kill_timeout: 5000
    }
  ]
};
"@
    
    # Create logs directory if it doesn't exist
    $logsDir = "C:\imperial-price-feeder\logs"
    if (-not (Test-Path $logsDir)) {
        New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
    }
    
    Set-Content -Path $pm2EcosystemPath -Value $ecosystemContent -Force
    Write-Host "   ✅ PM2 ecosystem file created: $pm2EcosystemPath" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Price feeder directory not found (will be configured later)" -ForegroundColor Yellow
}

Write-Host ""

# ============================================================================
# STEP 9: Create Watchdog Scripts for Never-Ending Services
# ============================================================================
Write-Host "STEP 9: Creating Watchdog Scripts..." -ForegroundColor Yellow

# Create watchdog directory
$watchdogDir = "C:\imperial-watchdogs"
if (-not (Test-Path $watchdogDir)) {
    New-Item -ItemType Directory -Path $watchdogDir -Force | Out-Null
}

# Price Feeder Watchdog
$priceFeederWatchdog = @"
// Price Feeder Watchdog - Ensures service NEVER dies
const pm2 = require('pm2');
const { execSync } = require('child_process');

const SERVICE_NAME = 'Imperial Price Feeder';
const CHECK_INTERVAL = 10000; // Check every 10 seconds
const MAX_RESTART_ATTEMPTS = 999999; // Unlimited

function checkService() {
    pm2.list((err, list) => {
        if (err) {
            console.error('PM2 Error:', err);
            setTimeout(checkService, CHECK_INTERVAL);
            return;
        }

        const service = list.find(p => p.name === SERVICE_NAME);
        
        if (!service) {
            console.log(`[WATCHDOG] ${SERVICE_NAME} NOT FOUND - Starting...`);
            pm2.start('C:\\imperial-price-feeder\\pm2-ecosystem.config.js', {
                name: SERVICE_NAME
            }, (err) => {
                if (err) {
                    console.error(`[WATCHDOG] Failed to start ${SERVICE_NAME}:`, err);
                } else {
                    console.log(`[WATCHDOG] ✅ ${SERVICE_NAME} started`);
                }
                setTimeout(checkService, CHECK_INTERVAL);
            });
        } else if (service.pm2_env.status !== 'online') {
            console.log(`[WATCHDOG] ${SERVICE_NAME} is ${service.pm2_env.status} - Restarting...`);
            pm2.restart(SERVICE_NAME, (err) => {
                if (err) {
                    console.error(`[WATCHDOG] Failed to restart ${SERVICE_NAME}:`, err);
                    // Try to start fresh
                    pm2.delete(SERVICE_NAME, () => {
                        pm2.start('C:\\imperial-price-feeder\\pm2-ecosystem.config.js', {
                            name: SERVICE_NAME
                        }, () => {
                            setTimeout(checkService, CHECK_INTERVAL);
                        });
                    });
                } else {
                    console.log(`[WATCHDOG] ✅ ${SERVICE_NAME} restarted`);
                    setTimeout(checkService, CHECK_INTERVAL);
                }
            });
        } else {
            // Service is online, check MT5 process
            checkMT5Process();
            setTimeout(checkService, CHECK_INTERVAL);
        }
    });
}

function checkMT5Process() {
    try {
        const result = execSync('powershell -Command "Get-Process -Name terminal64 -ErrorAction SilentlyContinue | Where-Object { $_.Path -like \'*EC Markets*\' }"', { encoding: 'utf-8' });
        if (!result.trim()) {
            console.log('[WATCHDOG] ⚠️  EC Markets MT5 not running - Price feeder may not work properly');
        }
    } catch (error) {
        // MT5 not running - log but don't fail
    }
}

console.log(`[WATCHDOG] Starting ${SERVICE_NAME} watchdog...`);
console.log(`[WATCHDOG] Check interval: ${CHECK_INTERVAL/1000}s`);
console.log(`[WATCHDOG] Max restarts: Unlimited`);

pm2.connect((err) => {
    if (err) {
        console.error('Failed to connect to PM2:', err);
        process.exit(1);
    }
    
    checkService();
});

// Keep process alive
process.on('SIGINT', () => {
    pm2.disconnect();
    process.exit(0);
});
"@

Set-Content -Path "$watchdogDir\price-feeder-watchdog.js" -Value $priceFeederWatchdog -Force
Write-Host "   ✅ Price Feeder Watchdog created" -ForegroundColor Green

# MT5 Watchdog
$mt5Watchdog = @"
// EC Markets MT5 Watchdog - Ensures MT5 NEVER closes
const { exec, spawn } = require('child_process');
const path = require('path');

const MT5_PATH = 'C:\\Program Files\\EC Markets MetaTrader 5\\terminal64.exe';
const CHECK_INTERVAL = 15000; // Check every 15 seconds
const RESTART_DELAY = 5000; // Wait 5 seconds before restart

function checkMT5() {
    exec('powershell -Command "Get-Process -Name terminal64 -ErrorAction SilentlyContinue | Where-Object { $_.Path -like \'*EC Markets*\' }"', (error, stdout, stderr) => {
        if (stdout.trim()) {
            // MT5 is running
            console.log(`[MT5-WATCHDOG] ✅ EC Markets MT5 is running`);
        } else {
            // MT5 is not running - start it
            console.log(`[MT5-WATCHDOG] ❌ EC Markets MT5 not found - Starting...`);
            
            setTimeout(() => {
                const mt5 = spawn(MT5_PATH, [], {
                    detached: true,
                    stdio: 'ignore'
                });
                
                mt5.unref();
                
                console.log(`[MT5-WATCHDOG] ✅ EC Markets MT5 started (PID: ${mt5.pid})`);
            }, RESTART_DELAY);
        }
        
        setTimeout(checkMT5, CHECK_INTERVAL);
    });
}

console.log('[MT5-WATCHDOG] Starting EC Markets MT5 watchdog...');
console.log(`[MT5-WATCHDOG] MT5 Path: ${MT5_PATH}`);
console.log(`[MT5-WATCHDOG] Check interval: ${CHECK_INTERVAL/1000}s`);

checkMT5();
"@

Set-Content -Path "$watchdogDir\mt5-watchdog.js" -Value $mt5Watchdog -Force
Write-Host "   ✅ MT5 Watchdog created" -ForegroundColor Green

Write-Host ""

# ============================================================================
# STEP 10: Install Watchdog Dependencies
# ============================================================================
Write-Host "STEP 10: Installing Watchdog Dependencies..." -ForegroundColor Yellow

if (Test-Path $watchdogDir) {
    Set-Location $watchdogDir
    if (-not (Test-Path "package.json")) {
        npm init -y | Out-Null
        npm install pm2 --save | Out-Null
        Write-Host "   ✅ Watchdog dependencies installed" -ForegroundColor Green
    } else {
        Write-Host "   ✅ Watchdog dependencies already installed" -ForegroundColor Green
    }
    Set-Location $env:USERPROFILE
}

Write-Host ""

# ============================================================================
# STEP 11: Configure Windows Firewall (if needed)
# ============================================================================
Write-Host "STEP 11: Checking Windows Firewall..." -ForegroundColor Yellow

# Allow Node.js through firewall (for PM2 and services)
$nodePath = (Get-Command node).Path
if ($nodePath) {
    $firewallRule = Get-NetFirewallApplicationFilter -Program $nodePath -ErrorAction SilentlyContinue
    if (-not $firewallRule) {
        New-NetFirewallRule -DisplayName "Node.js - Trading App Services" `
                           -Direction Inbound `
                           -Program $nodePath `
                           -Action Allow `
                           -Profile Any | Out-Null
        Write-Host "   ✅ Windows Firewall rule added for Node.js" -ForegroundColor Green
    } else {
        Write-Host "   ✅ Windows Firewall already configured for Node.js" -ForegroundColor Green
    }
}

Write-Host ""

# ============================================================================
# COMPLETE SUMMARY
# ============================================================================
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  SETUP COMPLETE!" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

if ($allInstalled) {
    Write-Host "✅ All runtime environments installed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Yellow
    Write-Host "  1. Start watchdogs: pm2 start $watchdogDir\price-feeder-watchdog.js --name 'Price Feeder Watchdog'" -ForegroundColor White
    Write-Host "  2. Start MT5 watchdog: pm2 start $watchdogDir\mt5-watchdog.js --name 'MT5 Watchdog'" -ForegroundColor White
    Write-Host "  3. Save PM2 configuration: pm2 save" -ForegroundColor White
    Write-Host "  4. Verify services: pm2 list" -ForegroundColor White
    Write-Host ""
    Write-Host "✅ Services will auto-start on boot and NEVER die!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Some installations failed. Please review errors above." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan




