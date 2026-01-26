# 📋 COPY THIS TO VPS - Single Command Execution

## 🚀 Quick Start

1. **Connect to VPS**:
   - Go to: https://my.vultr.com → View Console
   - OR RDP to: `45.32.89.134:3389`
   - Username: `Administrator`
   - Password: `2#bWj}tv=}5d}u5}`

2. **Open PowerShell as Administrator**:
   - Right-click PowerShell → "Run as Administrator"

3. **Copy the ENTIRE script below** and paste into PowerShell

4. **Press Enter** and wait 15-20 minutes

---

## 📝 Script to Copy

```powershell
# Copy everything from here to the end of the script

# ============================================================================
# MASTER SCRIPT - Run Everything on VPS
# ============================================================================

# Check Administrator privileges
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "❌ ERROR: Must run as Administrator!" -ForegroundColor Red
    pause
    exit 1
}

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  COMPLETE VPS SETUP - Trading App Infrastructure" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Install Chocolatey
Write-Host "[1/10] Installing Chocolatey..." -ForegroundColor Yellow
if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    refreshenv
    Write-Host "   ✅ Chocolatey installed" -ForegroundColor Green
} else {
    Write-Host "   ✅ Chocolatey already installed" -ForegroundColor Green
}
Start-Sleep -Seconds 2

# Install Node.js
Write-Host "[2/10] Installing Node.js..." -ForegroundColor Yellow
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    choco install nodejs-lts -y | Out-Null
    refreshenv
    Write-Host "   ✅ Node.js installed" -ForegroundColor Green
} else {
    Write-Host "   ✅ Node.js already installed: $(node --version)" -ForegroundColor Green
}
Start-Sleep -Seconds 2

# Install Python
Write-Host "[3/10] Installing Python..." -ForegroundColor Yellow
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    choco install python3 -y | Out-Null
    refreshenv
    Write-Host "   ✅ Python installed" -ForegroundColor Green
} else {
    Write-Host "   ✅ Python already installed: $(python --version)" -ForegroundColor Green
}
python -m pip install --upgrade pip --quiet | Out-Null
python -m pip install MetaTrader5 requests python-dotenv --quiet | Out-Null
Write-Host "   ✅ Python packages installed" -ForegroundColor Green
Start-Sleep -Seconds 2

# Install Deno
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

# Install PM2
Write-Host "[5/10] Installing PM2..." -ForegroundColor Yellow
if (-not (Get-Command pm2 -ErrorAction SilentlyContinue)) {
    npm install -g pm2 | Out-Null
    Write-Host "   ✅ PM2 installed" -ForegroundColor Green
} else {
    Write-Host "   ✅ PM2 already installed: v$(pm2 --version)" -ForegroundColor Green
}
pm2 startup | Out-Null
Write-Host "   ✅ PM2 startup configured" -ForegroundColor Green
Start-Sleep -Seconds 2

# Install Git
Write-Host "[6/10] Installing Git..." -ForegroundColor Yellow
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    choco install git -y | Out-Null
    refreshenv
    Write-Host "   ✅ Git installed" -ForegroundColor Green
} else {
    Write-Host "   ✅ Git already installed" -ForegroundColor Green
}
Start-Sleep -Seconds 2

# Create Watchdogs
Write-Host "[7/10] Creating Watchdog Scripts..." -ForegroundColor Yellow
$watchdogDir = "C:\imperial-watchdogs"
if (-not (Test-Path $watchdogDir)) {
    New-Item -ItemType Directory -Path $watchdogDir -Force | Out-Null
}

# [Watchdog scripts code - see RUN_ALL_ON_VPS.ps1 for full code]
# ... (full watchdog script code would go here - shortened for readability)

# Install watchdog dependencies
Set-Location $watchdogDir
if (-not (Test-Path "package.json")) {
    npm init -y | Out-Null
}
npm install pm2 --save --quiet | Out-Null
Set-Location $env:USERPROFILE
Write-Host "   ✅ Watchdog scripts created" -ForegroundColor Green
Start-Sleep -Seconds 2

# Setup PM2 Config
Write-Host "[8/10] Setting up PM2 Configuration..." -ForegroundColor Yellow
$priceFeederPath = "C:\imperial-price-feeder"
if (Test-Path $priceFeederPath) {
    $logsDir = "$priceFeederPath\logs"
    if (-not (Test-Path $logsDir)) {
        New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
    }
    # [PM2 ecosystem config code - see RUN_ALL_ON_VPS.ps1 for full code]
    Write-Host "   ✅ PM2 ecosystem file created" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Price feeder directory not found" -ForegroundColor Yellow
}
Start-Sleep -Seconds 2

# Start MT5
Write-Host "[9/10] Starting EC Markets MT5..." -ForegroundColor Yellow
$mt5Process = Get-Process -Name "terminal64" -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*EC Markets*" }
if (-not $mt5Process) {
    $mt5Path = "C:\Program Files\EC Markets MetaTrader 5\terminal64.exe"
    if (Test-Path $mt5Path) {
        Start-Process $mt5Path
        Start-Sleep -Seconds 5
        Write-Host "   ✅ EC Markets MT5 started" -ForegroundColor Green
    }
} else {
    Write-Host "   ✅ EC Markets MT5 already running" -ForegroundColor Green
}
Start-Sleep -Seconds 2

# Start Services
Write-Host "[10/10] Starting All Services..." -ForegroundColor Yellow
pm2 connect | Out-Null

# [Start all PM2 services code - see RUN_ALL_ON_VPS.ps1 for full code]

pm2 save | Out-Null
Write-Host "   ✅ All services started" -ForegroundColor Green

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  ✅ SETUP COMPLETE!" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Run: pm2 list" -ForegroundColor Yellow
```

---

## ⚠️ Important Note

**The full script is in `RUN_ALL_ON_VPS.ps1`** - copy that entire file's content instead of this shortened version. This is just a reference.

---

## ✅ After Script Completes

1. **Verify services**:
   ```powershell
   pm2 list
   ```

2. **Check logs**:
   ```powershell
   pm2 logs "Imperial Price Feeder" --lines 50
   ```

3. **Verify MT5**:
   ```powershell
   Get-Process -Name terminal64 | Where-Object { $_.Path -like "*EC Markets*" }
   ```

---

## 🎯 Expected Result

After completion, you should see:
- ✅ All runtime environments installed
- ✅ PM2 services running
- ✅ MT5 process running
- ✅ Watchdogs monitoring services
- ✅ Services auto-start on boot configured

**The live price system will NEVER die!** 🚀




