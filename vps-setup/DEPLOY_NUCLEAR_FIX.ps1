# ============================================================================
# NUCLEAR FIX DEPLOYMENT SCRIPT
# ============================================================================
# This script:
# 1. Creates MT5_BrokerService portable folder
# 2. Copies MT5 files
# 3. Updates Python scripts to use portable path
# 4. Updates .env file
# 5. Rebuilds and restarts broker service
# ============================================================================

Write-Host ""
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "  NUCLEAR FIX DEPLOYMENT - MT5 BROKER SERVICE ISOLATION" -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Stop"

# Configuration
$MT5_SOURCE = "C:\Program Files\MetaTrader 5"
$MT5_BROKER_DEST = "C:\MT5_BrokerService"
$VPS_BROKER_SERVICE = "C:\vps-broker-service"

# ============================================================================
# STEP 1: Stop broker service
# ============================================================================
Write-Host "STEP 1: Stopping broker service..." -ForegroundColor Yellow

try {
    pm2 stop imperial-trade-broker-service 2>$null
    Write-Host "  [OK] Broker service stopped" -ForegroundColor Green
} catch {
    Write-Host "  [INFO] Broker service may not be running" -ForegroundColor Gray
}

# ============================================================================
# STEP 2: Create MT5_BrokerService folder
# ============================================================================
Write-Host ""
Write-Host "STEP 2: Setting up MT5_BrokerService portable folder..." -ForegroundColor Yellow

# Check source exists
if (-not (Test-Path "$MT5_SOURCE\terminal64.exe")) {
    Write-Host "  [ERROR] Source MT5 not found at: $MT5_SOURCE" -ForegroundColor Red
    exit 1
}

# Create destination folder
if (-not (Test-Path $MT5_BROKER_DEST)) {
    New-Item -ItemType Directory -Path $MT5_BROKER_DEST -Force | Out-Null
    Write-Host "  Created: $MT5_BROKER_DEST" -ForegroundColor Green
}

# Copy MT5 files
Write-Host "  Copying MT5 files..." -ForegroundColor Yellow

# Copy main executable
Copy-Item "$MT5_SOURCE\terminal64.exe" "$MT5_BROKER_DEST\" -Force
Write-Host "  [OK] Copied terminal64.exe" -ForegroundColor Green

# Copy DLLs
Get-ChildItem -Path $MT5_SOURCE -Filter "*.dll" -ErrorAction SilentlyContinue | ForEach-Object {
    Copy-Item $_.FullName "$MT5_BROKER_DEST\" -Force -ErrorAction SilentlyContinue
}
Write-Host "  [OK] Copied DLL files" -ForegroundColor Green

# Copy Config folder
if (Test-Path "$MT5_SOURCE\Config") {
    Copy-Item "$MT5_SOURCE\Config" "$MT5_BROKER_DEST\" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "  [OK] Copied Config folder" -ForegroundColor Green
}

# Create MQL5 structure
$folders = @(
    "$MT5_BROKER_DEST\MQL5",
    "$MT5_BROKER_DEST\MQL5\Experts",
    "$MT5_BROKER_DEST\MQL5\Scripts",
    "$MT5_BROKER_DEST\Logs",
    "$MT5_BROKER_DEST\Config",
    "$MT5_BROKER_DEST\Profiles"
)

foreach ($folder in $folders) {
    if (-not (Test-Path $folder)) {
        New-Item -ItemType Directory -Path $folder -Force | Out-Null
    }
}
Write-Host "  [OK] Created MQL5 folder structure" -ForegroundColor Green

# Create portable.ini
$portableIni = @"
; MetaTrader 5 Portable Mode Configuration
[Common]
DataPath=$MT5_BROKER_DEST
"@
$portableIni | Out-File -FilePath "$MT5_BROKER_DEST\portable.ini" -Encoding UTF8 -Force
Write-Host "  [OK] Created portable.ini" -ForegroundColor Green

# ============================================================================
# STEP 3: Update Python scripts
# ============================================================================
Write-Host ""
Write-Host "STEP 3: Updating Python scripts to use portable path..." -ForegroundColor Yellow

$pythonFiles = @(
    "$VPS_BROKER_SERVICE\python\test_connection.py",
    "$VPS_BROKER_SERVICE\python\fetch_trades.py",
    "$VPS_BROKER_SERVICE\python\get_servers.py"
)

foreach ($file in $pythonFiles) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        if ($content -match 'C:\\Program Files\\MetaTrader 5\\terminal64\.exe') {
            $newContent = $content -replace 'C:\\Program Files\\MetaTrader 5\\terminal64\.exe', 'C:\MT5_BrokerService\terminal64.exe'
            $newContent | Set-Content $file -NoNewline
            Write-Host "  [OK] Updated: $($file | Split-Path -Leaf)" -ForegroundColor Green
        } else {
            Write-Host "  [SKIP] Already updated: $($file | Split-Path -Leaf)" -ForegroundColor Gray
        }
    } else {
        Write-Host "  [WARN] Not found: $file" -ForegroundColor Yellow
    }
}

# ============================================================================
# STEP 4: Update .env file
# ============================================================================
Write-Host ""
Write-Host "STEP 4: Updating .env file..." -ForegroundColor Yellow

$envFile = "$VPS_BROKER_SERVICE\.env"
if (Test-Path $envFile) {
    $envContent = Get-Content $envFile -Raw
    
    # Update MT5_TERMINAL_PATH
    if ($envContent -match 'MT5_TERMINAL_PATH=') {
        $envContent = $envContent -replace 'MT5_TERMINAL_PATH=.*', "MT5_TERMINAL_PATH=C:\MT5_BrokerService\terminal64.exe"
    } else {
        $envContent += "`nMT5_TERMINAL_PATH=C:\MT5_BrokerService\terminal64.exe"
    }
    
    # Update MT5_TERMINALS_DATA_PATH
    if ($envContent -match 'MT5_TERMINALS_DATA_PATH=') {
        $envContent = $envContent -replace 'MT5_TERMINALS_DATA_PATH=.*', "MT5_TERMINALS_DATA_PATH=C:\MT5_BrokerService"
    } else {
        $envContent += "`nMT5_TERMINALS_DATA_PATH=C:\MT5_BrokerService"
    }
    
    $envContent | Set-Content $envFile -NoNewline
    Write-Host "  [OK] Updated .env with MT5_BrokerService paths" -ForegroundColor Green
} else {
    Write-Host "  [WARN] .env file not found, creating..." -ForegroundColor Yellow
    @"
VPS_API_KEY=imperial-trade-vps-2024
MT5_TERMINAL_PATH=C:\MT5_BrokerService\terminal64.exe
MT5_TERMINALS_DATA_PATH=C:\MT5_BrokerService
"@ | Set-Content $envFile
    Write-Host "  [OK] Created .env file" -ForegroundColor Green
}

# ============================================================================
# STEP 5: Rebuild broker service
# ============================================================================
Write-Host ""
Write-Host "STEP 5: Rebuilding broker service..." -ForegroundColor Yellow

Set-Location $VPS_BROKER_SERVICE
npm run build
Write-Host "  [OK] Build complete" -ForegroundColor Green

# ============================================================================
# STEP 6: Create desktop shortcut
# ============================================================================
Write-Host ""
Write-Host "STEP 6: Creating desktop shortcut..." -ForegroundColor Yellow

$WshShell = New-Object -ComObject WScript.Shell
$ShortcutPath = "$env:USERPROFILE\Desktop\MT5_BrokerService.lnk"
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = "$MT5_BROKER_DEST\terminal64.exe"
$Shortcut.Arguments = "/portable"
$Shortcut.WorkingDirectory = $MT5_BROKER_DEST
$Shortcut.Description = "MetaTrader 5 - Broker Service (Portable Mode)"
$Shortcut.Save()
Write-Host "  [OK] Created shortcut: MT5_BrokerService.lnk" -ForegroundColor Green

# ============================================================================
# STEP 7: Start MT5 in portable mode
# ============================================================================
Write-Host ""
Write-Host "STEP 7: Starting MT5 in portable mode..." -ForegroundColor Yellow

# Check if MT5 BrokerService is already running
$brokerMT5 = Get-Process -Name terminal64 -ErrorAction SilentlyContinue | Where-Object {
    try { $_.Path -like "*MT5_BrokerService*" } catch { $false }
}

if ($brokerMT5) {
    Write-Host "  [OK] MT5 BrokerService already running (PID: $($brokerMT5.Id))" -ForegroundColor Green
} else {
    Start-Process -FilePath "$MT5_BROKER_DEST\terminal64.exe" -ArgumentList "/portable" -WorkingDirectory $MT5_BROKER_DEST
    Start-Sleep -Seconds 3
    Write-Host "  [OK] MT5 started in portable mode" -ForegroundColor Green
}

# ============================================================================
# STEP 8: Restart broker service
# ============================================================================
Write-Host ""
Write-Host "STEP 8: Restarting broker service..." -ForegroundColor Yellow

pm2 restart imperial-trade-broker-service
Start-Sleep -Seconds 3
Write-Host "  [OK] Broker service restarted" -ForegroundColor Green

# ============================================================================
# STEP 9: Verify
# ============================================================================
Write-Host ""
Write-Host "STEP 9: Verifying setup..." -ForegroundColor Yellow

# Check PM2
pm2 status

# Check port
$port = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
if ($port) {
    Write-Host "  [OK] Port 3001: LISTENING" -ForegroundColor Green
} else {
    Write-Host "  [WARN] Port 3001: NOT LISTENING (may take a few seconds)" -ForegroundColor Yellow
}

# Check MT5 processes
$mt5Procs = Get-Process -Name terminal64 -ErrorAction SilentlyContinue
Write-Host "  [INFO] MT5 processes running: $($mt5Procs.Count)" -ForegroundColor Cyan

# Check Python path
$testPy = Get-Content "$VPS_BROKER_SERVICE\python\test_connection.py" -Raw
if ($testPy -match 'MT5_BrokerService') {
    Write-Host "  [OK] Python scripts: Using MT5_BrokerService" -ForegroundColor Green
} else {
    Write-Host "  [WARN] Python scripts: Still using old path" -ForegroundColor Yellow
}

# ============================================================================
# FINAL SUMMARY
# ============================================================================
Write-Host ""
Write-Host "===============================================================================" -ForegroundColor Green
Write-Host "  NUCLEAR FIX DEPLOYED!" -ForegroundColor Green
Write-Host "===============================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  MT5 BrokerService: $MT5_BROKER_DEST" -ForegroundColor Cyan
Write-Host "  Desktop Shortcut: MT5_BrokerService.lnk" -ForegroundColor Cyan
Write-Host ""
Write-Host "  IMPORTANT NEXT STEPS:" -ForegroundColor Yellow
Write-Host "  1. In the MT5 window, go to File > Open Data Folder" -ForegroundColor Yellow
Write-Host "  2. Verify path is: $MT5_BROKER_DEST (NOT AppData\Roaming)" -ForegroundColor Yellow
Write-Host "  3. Log into your broker account" -ForegroundColor Yellow
Write-Host "  4. Enable: Tools > Options > Expert Advisors > Allow Algo Trading" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Then test from the frontend - should connect in 2-5 seconds!" -ForegroundColor Green
Write-Host ""
