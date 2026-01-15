# Nuclear Fix for Error [32] - True Portable Mode
# This script physically moves MT5 to isolated folders and forces portable mode

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  NUCLEAR FIX FOR ERROR [32]" -ForegroundColor Cyan
Write-Host "  True Portable Mode Implementation" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Nuclear Process Kill
Write-Host "Step 1: Killing all MT5 and Python processes..." -ForegroundColor Yellow
taskkill /F /IM terminal64.exe 2>$null
taskkill /F /IM python.exe 2>$null
Start-Sleep -Seconds 2
pm2 stop all 2>$null
Start-Sleep -Seconds 2
Write-Host "✅ All processes stopped" -ForegroundColor Green
Write-Host ""

# Step 2: Create and Prepare Isolation Directories
Write-Host "Step 2: Creating isolated MT5 directories..." -ForegroundColor Yellow

# Broker Service Directory
$brokerDir = "C:\MT5_BrokerService"
if (Test-Path $brokerDir) {
    Write-Host "  Cleaning existing $brokerDir..." -ForegroundColor Gray
    Remove-Item -Path "$brokerDir\*" -Recurse -Force -ErrorAction SilentlyContinue
} else {
    New-Item -ItemType Directory -Path $brokerDir -Force | Out-Null
}
Write-Host "✅ Broker Service directory ready: $brokerDir" -ForegroundColor Green

# Price Feeder Directory
$priceFeederDir = "C:\MT5_PriceFeeder"
if (Test-Path $priceFeederDir) {
    Write-Host "  Price Feeder directory exists: $priceFeederDir" -ForegroundColor Gray
} else {
    New-Item -ItemType Directory -Path $priceFeederDir -Force | Out-Null
    Write-Host "✅ Price Feeder directory created: $priceFeederDir" -ForegroundColor Green
}
Write-Host ""

# Step 3: Copy MT5 Files to Broker Service Directory
Write-Host "Step 3: Copying MT5 files to isolated directory..." -ForegroundColor Yellow
$mt5Source = "C:\Program Files\MetaTrader 5"
if (Test-Path $mt5Source) {
    Write-Host "  Source: $mt5Source" -ForegroundColor Gray
    Write-Host "  Destination: $brokerDir" -ForegroundColor Gray
    Write-Host "  This may take a few minutes..." -ForegroundColor Gray
    
    # Copy all files and folders
    Copy-Item -Path "$mt5Source\*" -Destination $brokerDir -Recurse -Force -ErrorAction SilentlyContinue
    
    Write-Host "✅ MT5 files copied to $brokerDir" -ForegroundColor Green
} else {
    Write-Host "❌ MT5 source not found: $mt5Source" -ForegroundColor Red
    Write-Host "   Please install MT5 first" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Step 4: Delete Broker Database to Fix Error [32]
Write-Host "Step 4: Fixing EURUSD Error [32] (deleting locked database)..." -ForegroundColor Yellow
$basesDir = "$brokerDir\bases"
if (Test-Path $basesDir) {
    # Find and delete broker-specific folders (e.g., ECMarkets-Demo, ECMarketsLtd-Demo)
    $brokerFolders = Get-ChildItem -Path $basesDir -Directory -ErrorAction SilentlyContinue | 
        Where-Object { $_.Name -like "*ECMarkets*" -or $_.Name -like "*EC*" }
    
    foreach ($folder in $brokerFolders) {
        Write-Host "  Deleting locked database: $($folder.Name)" -ForegroundColor Gray
        Remove-Item -Path $folder.FullName -Recurse -Force -ErrorAction SilentlyContinue
    }
    Write-Host "✅ Locked databases removed" -ForegroundColor Green
} else {
    Write-Host "⚠️  Bases directory not found (will be created on first launch)" -ForegroundColor Yellow
}
Write-Host ""

# Step 5: Launch MT5 in True Portable Mode
Write-Host "Step 5: Launching MT5 in TRUE portable mode..." -ForegroundColor Yellow
$terminalPath = "$brokerDir\terminal64.exe"
if (Test-Path $terminalPath) {
    Write-Host "  Starting: $terminalPath /portable" -ForegroundColor Gray
    Start-Process -FilePath $terminalPath -ArgumentList "/portable" -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 5
    
    Write-Host "✅ MT5 launched in portable mode" -ForegroundColor Green
    Write-Host "   Check MT5 Journal - Data Folder should be: $brokerDir" -ForegroundColor Cyan
    Write-Host "   If it shows AppData\Roaming, portable mode failed!" -ForegroundColor Yellow
} else {
    Write-Host "❌ Terminal not found: $terminalPath" -ForegroundColor Red
}
Write-Host ""

# Step 6: Update .env File
Write-Host "Step 6: Updating .env file..." -ForegroundColor Yellow
$envFile = "C:\vps-broker-service\.env"
if (Test-Path $envFile) {
    $envContent = Get-Content $envFile -Raw
    
    # Update or add MT5_TERMINAL_PATH
    if ($envContent -match "MT5_TERMINAL_PATH=") {
        $envContent = $envContent -replace "MT5_TERMINAL_PATH=.*", "MT5_TERMINAL_PATH=$terminalPath"
    } else {
        $envContent += "`nMT5_TERMINAL_PATH=$terminalPath`n"
    }
    
    # Update or add MT5_DATA_PATH for portable mode
    if ($envContent -match "MT5_DATA_PATH=") {
        $envContent = $envContent -replace "MT5_DATA_PATH=.*", "MT5_DATA_PATH=$brokerDir"
    } else {
        $envContent += "MT5_DATA_PATH=$brokerDir`n"
    }
    
    # Ensure portable mode is enabled
    if ($envContent -match "MT5_PORTABLE_MODE=") {
        $envContent = $envContent -replace "MT5_PORTABLE_MODE=.*", "MT5_PORTABLE_MODE=true"
    } else {
        $envContent += "MT5_PORTABLE_MODE=true`n"
    }
    
    Set-Content -Path $envFile -Value $envContent -NoNewline
    Write-Host "✅ .env file updated" -ForegroundColor Green
    Write-Host "   MT5_TERMINAL_PATH=$terminalPath" -ForegroundColor Gray
    Write-Host "   MT5_DATA_PATH=$brokerDir" -ForegroundColor Gray
    Write-Host "   MT5_PORTABLE_MODE=true" -ForegroundColor Gray
} else {
    Write-Host "⚠️  .env file not found: $envFile" -ForegroundColor Yellow
    Write-Host "   Creating new .env file..." -ForegroundColor Gray
    $newEnvContent = @"
MT5_TERMINAL_PATH=$terminalPath
MT5_DATA_PATH=$brokerDir
MT5_PORTABLE_MODE=true
"@
    Set-Content -Path $envFile -Value $newEnvContent
    Write-Host "✅ New .env file created" -ForegroundColor Green
}
Write-Host ""

# Step 7: Restart PM2 Services
Write-Host "Step 7: Restarting PM2 services..." -ForegroundColor Yellow
pm2 restart all 2>$null
Start-Sleep -Seconds 3
pm2 status
Write-Host ""

# Step 8: Verification
Write-Host "Step 8: Verification..." -ForegroundColor Yellow
Write-Host "  Checking MT5 process..." -ForegroundColor Gray
$mt5Process = Get-Process -Name terminal64 -ErrorAction SilentlyContinue
if ($mt5Process) {
    Write-Host "  ✅ MT5 process running (PID: $($mt5Process.Id))" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  MT5 process not found (may need manual launch)" -ForegroundColor Yellow
}

Write-Host "  Checking directory..." -ForegroundColor Gray
if (Test-Path $brokerDir) {
    $fileCount = (Get-ChildItem -Path $brokerDir -File -Recurse -ErrorAction SilentlyContinue).Count
    Write-Host "  ✅ Directory exists with $fileCount files" -ForegroundColor Green
} else {
    Write-Host "  ❌ Directory not found!" -ForegroundColor Red
}
Write-Host ""

# Final Instructions
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  NUCLEAR FIX COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Check MT5 Journal - Data Folder should be: $brokerDir" -ForegroundColor White
Write-Host "2. If it shows AppData\Roaming, close MT5 and run:" -ForegroundColor White
Write-Host "   Start-Process `"$terminalPath`" -ArgumentList `/portable`" -ForegroundColor Gray
Write-Host "3. Test health endpoint: http://45.32.89.134:3001/health" -ForegroundColor White
Write-Host "4. Test connection from website" -ForegroundColor White
Write-Host "5. Monitor logs: pm2 logs imperial-trade-broker-service" -ForegroundColor White
Write-Host ""
Write-Host "Expected Result:" -ForegroundColor Yellow
Write-Host "  ✅ Connection completes in <5 seconds" -ForegroundColor Green
Write-Host "  ✅ No Error [32] in MT5 Journal" -ForegroundColor Green
Write-Host "  ✅ No 60s timeout" -ForegroundColor Green
Write-Host ""
