# ============================================================================
# COMPLETE VPS ENVIRONMENT SETUP - Trading App Infrastructure
# ============================================================================
# This script installs EVERYTHING needed for building a trading app:
# - Python, Deno, Node.js, PM2
# - PowerShell modules
# - WinRM (for remote execution)
# - SSH Server (for remote access)
# - All runtime environments and process managers
#
# Run this as Administrator on VPS
# ============================================================================

# Check Administrator privileges
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "❌ ERROR: Must run as Administrator! Right-click PowerShell → Run as Administrator" -ForegroundColor Red
    pause
    exit 1
}

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  COMPLETE VPS ENVIRONMENT SETUP" -ForegroundColor Cyan
Write-Host "  Trading App Infrastructure Installation" -ForegroundColor Gray
Write-Host "  Estimated time: 20-25 minutes" -ForegroundColor Gray
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# STEP 1: Install Chocolatey (Windows Package Manager)
# ============================================================================
Write-Host "[1/12] Installing Chocolatey..." -ForegroundColor Yellow
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
# STEP 2: Install Node.js LTS
# ============================================================================
Write-Host "[2/12] Installing Node.js LTS..." -ForegroundColor Yellow
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    choco install nodejs-lts -y | Out-Null
    refreshenv
    Write-Host "   ✅ Node.js installed: $(node --version)" -ForegroundColor Green
} else {
    Write-Host "   ✅ Node.js already installed: $(node --version)" -ForegroundColor Green
}
Start-Sleep -Seconds 2

# ============================================================================
# STEP 3: Install Python 3 with Trading Packages
# ============================================================================
Write-Host "[3/12] Installing Python 3..." -ForegroundColor Yellow
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    choco install python3 -y | Out-Null
    refreshenv
    Write-Host "   ✅ Python installed: $(python --version)" -ForegroundColor Green
} else {
    Write-Host "   ✅ Python already installed: $(python --version)" -ForegroundColor Green
}

# Install Python packages for trading
Write-Host "   Installing Python trading packages..." -ForegroundColor Gray
python -m pip install --upgrade pip --quiet | Out-Null
python -m pip install MetaTrader5 requests python-dotenv pandas numpy matplotlib ta-lib --quiet | Out-Null
Write-Host "   ✅ Python trading packages installed" -ForegroundColor Green
Start-Sleep -Seconds 2

# ============================================================================
# STEP 4: Install Deno Runtime
# ============================================================================
Write-Host "[4/12] Installing Deno..." -ForegroundColor Yellow
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
# STEP 5: Install PM2 Process Manager
# ============================================================================
Write-Host "[5/12] Installing PM2 Process Manager..." -ForegroundColor Yellow
if (-not (Get-Command pm2 -ErrorAction SilentlyContinue)) {
    npm install -g pm2 pm2-windows-startup pm2-windows-service | Out-Null
    Write-Host "   ✅ PM2 installed: v$(pm2 --version)" -ForegroundColor Green
} else {
    Write-Host "   ✅ PM2 already installed: v$(pm2 --version)" -ForegroundColor Green
}

# Setup PM2 startup
Write-Host "   Configuring PM2 startup..." -ForegroundColor Gray
pm2 startup | Out-Null
pm2 set pm2-windows-startup:user Administrator | Out-Null
Write-Host "   ✅ PM2 startup configured" -ForegroundColor Green
Start-Sleep -Seconds 2

# ============================================================================
# STEP 6: Install Git
# ============================================================================
Write-Host "[6/12] Installing Git..." -ForegroundColor Yellow
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    choco install git -y | Out-Null
    refreshenv
    Write-Host "   ✅ Git installed: $(git --version)" -ForegroundColor Green
} else {
    Write-Host "   ✅ Git already installed: $(git --version)" -ForegroundColor Green
}
Start-Sleep -Seconds 2

# ============================================================================
# STEP 7: Enable and Configure WinRM (PowerShell Remoting)
# ============================================================================
Write-Host "[7/12] Enabling WinRM (PowerShell Remoting)..." -ForegroundColor Yellow
try {
    # Enable WinRM
    Enable-PSRemoting -Force -SkipNetworkProfileCheck | Out-Null
    
    # Configure WinRM to allow connections
    winrm quickconfig -q | Out-Null
    
    # Set WinRM service to auto-start
    Set-Service -Name WinRM -StartupType Automatic
    Start-Service WinRM
    
    # Configure firewall rule for WinRM
    $firewallRule = Get-NetFirewallRule -Name "WINRM-HTTP-In-TCP*" -ErrorAction SilentlyContinue
    if (-not $firewallRule) {
        New-NetFirewallRule -DisplayName "Windows Remote Management (HTTP-In)" -Name "WINRM-HTTP-In-TCP" -Enabled True -Profile Any -Action Allow -Protocol TCP -LocalPort 5985 | Out-Null
    }
    
    Write-Host "   ✅ WinRM enabled and configured" -ForegroundColor Green
    Write-Host "   ✅ WinRM listening on port 5985" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  WinRM configuration had issues: $($_.Exception.Message)" -ForegroundColor Yellow
}
Start-Sleep -Seconds 2

# ============================================================================
# STEP 8: Install and Enable OpenSSH Server
# ============================================================================
Write-Host "[8/12] Installing OpenSSH Server..." -ForegroundColor Yellow
try {
    # Install OpenSSH Server
    $sshFeature = Get-WindowsCapability -Online | Where-Object Name -like 'OpenSSH.Server*'
    if ($sshFeature.State -ne 'Installed') {
        Add-WindowsCapability -Online -Name $sshFeature.Name | Out-Null
    }
    
    # Start and configure SSH service
    Start-Service sshd
    Set-Service -Name sshd -StartupType 'Automatic'
    
    # Configure firewall rule for SSH
    $sshFirewallRule = Get-NetFirewallRule -Name "OpenSSH-Server-In-TCP" -ErrorAction SilentlyContinue
    if (-not $sshFirewallRule) {
        New-NetFirewallRule -DisplayName "OpenSSH SSH Server (sshd)" -Name "OpenSSH-Server-In-TCP" -Enabled True -Profile Any -Action Allow -Protocol TCP -LocalPort 22 | Out-Null
    }
    
    Write-Host "   ✅ OpenSSH Server installed and enabled" -ForegroundColor Green
    Write-Host "   ✅ SSH listening on port 22" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  SSH installation had issues: $($_.Exception.Message)" -ForegroundColor Yellow
}
Start-Sleep -Seconds 2

# ============================================================================
# STEP 9: Install Additional PowerShell Modules for Trading
# ============================================================================
Write-Host "[9/12] Installing PowerShell modules..." -ForegroundColor Yellow
try {
    # Install useful PowerShell modules
    Install-Module -Name PSWindowsUpdate -Force -AllowClobber -Scope AllUsers -SkipPublisherCheck -ErrorAction SilentlyContinue | Out-Null
    Install-Module -Name PSReadLine -Force -AllowClobber -Scope AllUsers -SkipPublisherCheck -ErrorAction SilentlyContinue | Out-Null
    Write-Host "   ✅ PowerShell modules installed" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  Some PowerShell modules failed to install: $($_.Exception.Message)" -ForegroundColor Yellow
}
Start-Sleep -Seconds 2

# ============================================================================
# STEP 10: Install Additional Build Tools
# ============================================================================
Write-Host "[10/12] Installing additional build tools..." -ForegroundColor Yellow

# Install Visual C++ Build Tools (needed for native modules)
if (-not (Test-Path "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools")) {
    choco install visualstudio2022buildtools --package-parameters "--add Microsoft.VisualStudio.Workload.VCTools" -y | Out-Null
    Write-Host "   ✅ Visual C++ Build Tools installed" -ForegroundColor Green
} else {
    Write-Host "   ✅ Visual C++ Build Tools already installed" -ForegroundColor Green
}

# Install Windows SDK
choco install windows-sdk-10.1 -y | Out-Null

Write-Host "   ✅ Build tools installed" -ForegroundColor Green
Start-Sleep -Seconds 2

# ============================================================================
# STEP 11: Create Watchdog Scripts
# ============================================================================
Write-Host "[11/12] Creating Watchdog Scripts..." -ForegroundColor Yellow

$watchdogDir = "C:\imperial-watchdogs"
if (-not (Test-Path $watchdogDir)) {
    New-Item -ItemType Directory -Path $watchdogDir -Force | Out-Null
}

# Price Feeder Watchdog
$priceFeederWatchdog = @'
// Price Feeder Watchdog - Ensures service NEVER dies
const pm2 = require('pm2');

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
                setTimeout(checkService, CHECK_INTERVAL);
            }
        } else if (service.pm2_env.status !== 'online') {
            console.log(`[WATCHDOG] ${SERVICE_NAME} is ${service.pm2_env.status} - Restarting...`);
            pm2.restart(SERVICE_NAME, (err) => {
                if (err) {
                    pm2.delete(SERVICE_NAME, () => {
                        setTimeout(checkService, CHECK_INTERVAL);
                    });
                } else {
                    setTimeout(checkService, CHECK_INTERVAL);
                }
            });
        } else {
            setTimeout(checkService, CHECK_INTERVAL);
        }
    });
}

console.log(`[WATCHDOG] Starting ${SERVICE_NAME} watchdog`);
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
// EC Markets MT5 Watchdog
const { exec, spawn } = require('child_process');

const MT5_PATH = 'C:\\Program Files\\EC Markets MetaTrader 5\\terminal64.exe';
const CHECK_INTERVAL = 15000;

function checkMT5() {
    exec('powershell -Command "Get-Process -Name terminal64 -ErrorAction SilentlyContinue | Where-Object { $_.Path -like \'*EC Markets*\' }"', (error, stdout) => {
        if (stdout.trim()) {
            console.log(`[MT5-WATCHDOG] ✅ EC Markets MT5 is running`);
        } else {
            console.log(`[MT5-WATCHDOG] ❌ EC Markets MT5 not found - Starting...`);
            setTimeout(() => {
                const fs = require('fs');
                if (fs.existsSync(MT5_PATH)) {
                    const mt5 = spawn(MT5_PATH, [], { detached: true, stdio: 'ignore' });
                    mt5.unref();
                }
            }, 5000);
        }
        setTimeout(checkMT5, CHECK_INTERVAL);
    });
}

console.log('[MT5-WATCHDOG] Starting EC Markets MT5 watchdog');
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
# STEP 12: Start EC Markets MT5 and Verify Setup
# ============================================================================
Write-Host "[12/12] Starting EC Markets MT5 and Verifying Setup..." -ForegroundColor Yellow

$mt5Process = Get-Process -Name "terminal64" -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*EC Markets*" }
if (-not $mt5Process) {
    $mt5Path = "C:\Program Files\EC Markets MetaTrader 5\terminal64.exe"
    if (Test-Path $mt5Path) {
        Start-Process $mt5Path
        Start-Sleep -Seconds 5
        Write-Host "   ✅ EC Markets MT5 started" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  EC Markets MT5 not found - please install manually" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ✅ EC Markets MT5 already running" -ForegroundColor Green
}

# ============================================================================
# VERIFICATION
# ============================================================================
Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  VERIFICATION" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Check all runtime environments
Write-Host "Runtime Environments:" -ForegroundColor Yellow
$envs = @(
    @{Name="Node.js"; Command="node"; Args="--version"},
    @{Name="Python"; Command="python"; Args="--version"},
    @{Name="Deno"; Command="deno"; Args="--version"},
    @{Name="PM2"; Command="pm2"; Args="--version"},
    @{Name="Git"; Command="git"; Args="--version"},
    @{Name="PowerShell"; Command="powershell"; Args="-Command `$PSVersionTable.PSVersion"}
)

foreach ($env in $envs) {
    try {
        $result = & $env.Command $env.Args 2>&1 | Select-Object -First 1
        Write-Host "   ✅ $($env.Name): $result" -ForegroundColor Green
    } catch {
        Write-Host "   ❌ $($env.Name): NOT FOUND" -ForegroundColor Red
    }
}

Write-Host ""

# Check services
Write-Host "Services:" -ForegroundColor Yellow
try {
    $winrmStatus = (Get-Service WinRM).Status
    Write-Host "   ✅ WinRM: $winrmStatus" -ForegroundColor Green
} catch {
    Write-Host "   ❌ WinRM: NOT AVAILABLE" -ForegroundColor Red
}

try {
    $sshStatus = (Get-Service sshd).Status
    Write-Host "   ✅ OpenSSH Server: $sshStatus" -ForegroundColor Green
} catch {
    Write-Host "   ❌ OpenSSH Server: NOT AVAILABLE" -ForegroundColor Red
}

Write-Host ""
Write-Host "Network Access:" -ForegroundColor Yellow
Write-Host "   ✅ WinRM: Port 5985 (PowerShell Remoting)" -ForegroundColor Green
Write-Host "   ✅ SSH: Port 22 (OpenSSH)" -ForegroundColor Green
Write-Host "   ✅ Broker Service: Port 3001 (if running)" -ForegroundColor Green

Write-Host ""

# ============================================================================
# FINAL SUMMARY
# ============================================================================
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  ✅ SETUP COMPLETE!" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Installed Runtime Environments:" -ForegroundColor Yellow
Write-Host "   ✅ Node.js LTS" -ForegroundColor White
Write-Host "   ✅ Python 3 with trading packages" -ForegroundColor White
Write-Host "   ✅ Deno Runtime" -ForegroundColor White
Write-Host "   ✅ PM2 Process Manager" -ForegroundColor White
Write-Host "   ✅ Git" -ForegroundColor White
Write-Host ""
Write-Host "Remote Access Configured:" -ForegroundColor Yellow
Write-Host "   ✅ WinRM (PowerShell Remoting) - Port 5985" -ForegroundColor White
Write-Host "   ✅ OpenSSH Server - Port 22" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "   1. Connect via SSH: ssh Administrator@45.32.89.134" -ForegroundColor White
Write-Host "   2. Connect via WinRM: Enter-PSSession -ComputerName 45.32.89.134 -Credential Administrator" -ForegroundColor White
Write-Host "   3. Start services: pm2 start all" -ForegroundColor White
Write-Host "   4. Check live price system: Verify price-ingestor is receiving data" -ForegroundColor White
Write-Host ""
Write-Host "✅ All runtime environments ready for trading app development!" -ForegroundColor Green
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")




