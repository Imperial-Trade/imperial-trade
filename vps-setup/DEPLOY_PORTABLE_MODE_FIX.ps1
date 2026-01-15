# Deploy Portable Mode Fix - Complete Solution
# This script deletes AppData folder and forces MT5 to use isolated directory

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DEPLOYING PORTABLE MODE FIX" -ForegroundColor Cyan
Write-Host "  Complete Solution Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Close all MT5 instances
Write-Host "Step 1: Closing all MT5 instances..." -ForegroundColor Yellow
taskkill /F /IM terminal64.exe 2>$null
taskkill /F /IM python.exe 2>$null
Start-Sleep -Seconds 3
Write-Host "✅ All MT5 instances closed" -ForegroundColor Green
Write-Host ""

# Step 2: Delete AppData folder (Nuclear Option)
Write-Host "Step 2: Deleting AppData folder to force portable mode..." -ForegroundColor Yellow
$appDataFolder = "C:\Users\Administrator\AppData\Roaming\MetaQuotes\Terminal\D0E8209F77C8CF37AD8BF550E51FF075"
$terminalFolder = "C:\Users\Administrator\AppData\Roaming\MetaQuotes\Terminal"

if (Test-Path $appDataFolder) {
    Write-Host "  Found AppData folder: $appDataFolder" -ForegroundColor Gray
    Write-Host "  Deleting to force MT5 to use isolated directory..." -ForegroundColor Gray
    Remove-Item -Path $appDataFolder -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "✅ AppData folder deleted" -ForegroundColor Green
} else {
    Write-Host "  AppData folder not found (may have been deleted already)" -ForegroundColor Gray
    Write-Host "✅ No AppData folder to delete" -ForegroundColor Green
}

# Also delete the entire Terminal folder if it exists and is empty
if (Test-Path $terminalFolder) {
    $remainingFolders = Get-ChildItem -Path $terminalFolder -Directory -ErrorAction SilentlyContinue
    if ($remainingFolders.Count -eq 0) {
        Write-Host "  Terminal folder is empty, cleaning up..." -ForegroundColor Gray
        Remove-Item -Path $terminalFolder -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "✅ Terminal folder cleaned up" -ForegroundColor Green
    }
}
Write-Host ""

# Step 3: Verify isolated directory exists
Write-Host "Step 3: Verifying isolated directory..." -ForegroundColor Yellow
$brokerDir = "C:\MT5_BrokerService"
$terminalPath = "$brokerDir\terminal64.exe"

if (Test-Path $terminalPath) {
    Write-Host "✅ Isolated terminal found: $terminalPath" -ForegroundColor Green
    $fileCount = (Get-ChildItem -Path $brokerDir -File -Recurse -ErrorAction SilentlyContinue).Count
    Write-Host "   Directory contains $fileCount files" -ForegroundColor Gray
} else {
    Write-Host "❌ Isolated terminal NOT found: $terminalPath" -ForegroundColor Red
    Write-Host "   Running nuclear fix first..." -ForegroundColor Yellow
    
    # Run nuclear fix if directory doesn't exist
    $nuclearFix = "C:\vps-broker-service\vps-setup\NUCLEAR_FIX_ERROR_32.ps1"
    if (Test-Path $nuclearFix) {
        Write-Host "   Executing nuclear fix..." -ForegroundColor Gray
        & powershell.exe -ExecutionPolicy Bypass -File $nuclearFix
        Start-Sleep -Seconds 10
    } else {
        Write-Host "   Nuclear fix script not found!" -ForegroundColor Red
        Write-Host "   Please run NUCLEAR_FIX_ERROR_32.ps1 first" -ForegroundColor Yellow
        exit 1
    }
}
Write-Host ""

# Step 4: Launch MT5 in TRUE portable mode
Write-Host "Step 4: Launching MT5 in TRUE portable mode..." -ForegroundColor Yellow
Write-Host "  Command: Start-Process `"$terminalPath`" -ArgumentList `/portable`" -ForegroundColor Gray

Start-Process -FilePath $terminalPath -ArgumentList "/portable"
Start-Sleep -Seconds 8

Write-Host "✅ MT5 launched with /portable argument" -ForegroundColor Green
Write-Host ""

# Step 5: Verify MT5 is running
Write-Host "Step 5: Verifying MT5 is running..." -ForegroundColor Yellow
$mt5Process = Get-Process -Name terminal64 -ErrorAction SilentlyContinue
if ($mt5Process) {
    Write-Host "✅ MT5 process running (PID: $($mt5Process.Id))" -ForegroundColor Green
    Write-Host "   Path: $($mt5Process.Path)" -ForegroundColor Gray
} else {
    Write-Host "⚠️  MT5 process not found (may need more time to start)" -ForegroundColor Yellow
}
Write-Host ""

# Step 6: Update .env file (ensure portable mode is set)
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
    
    # Update or add MT5_DATA_PATH
    if ($envContent -match "MT5_DATA_PATH=") {
        $envContent = $envContent -replace "MT5_DATA_PATH=.*", "MT5_DATA_PATH=$brokerDir"
    } else {
        $envContent += "MT5_DATA_PATH=$brokerDir`n"
    }
    
    # Update or add MT5_PORTABLE_MODE
    if ($envContent -match "MT5_PORTABLE_MODE=") {
        $envContent = $envContent -replace "MT5_PORTABLE_MODE=.*", "MT5_PORTABLE_MODE=true"
    } else {
        $envContent += "MT5_PORTABLE_MODE=true`n"
    }
    
    Set-Content -Path $envFile -Value $envContent -NoNewline
    Write-Host "✅ .env file updated" -ForegroundColor Green
} else {
    Write-Host "⚠️  .env file not found, creating new one..." -ForegroundColor Yellow
    $newEnvContent = @"
MT5_TERMINAL_PATH=$terminalPath
MT5_DATA_PATH=$brokerDir
MT5_PORTABLE_MODE=true
"@
    Set-Content -Path $envFile -Value $newEnvContent
    Write-Host "✅ New .env file created" -ForegroundColor Green
}
Write-Host ""

# Step 7: Restart PM2 services
Write-Host "Step 7: Restarting PM2 services..." -ForegroundColor Yellow
pm2 restart all 2>$null
Start-Sleep -Seconds 3
pm2 status
Write-Host ""

# Step 8: Final verification
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DEPLOYMENT COMPLETE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ CRITICAL VERIFICATION REQUIRED:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. In MT5 window, go to: File > Open Data Folder" -ForegroundColor White
Write-Host ""
Write-Host "2. Check the path in the address bar:" -ForegroundColor White
Write-Host "   ✅ SUCCESS: Should show $brokerDir" -ForegroundColor Green
Write-Host "   ❌ FAIL: If it shows AppData\Roaming, the fix didn't work" -ForegroundColor Red
Write-Host ""
Write-Host "3. If it shows AppData\Roaming:" -ForegroundColor Yellow
Write-Host "   • Close MT5 completely" -ForegroundColor White
Write-Host "   • Run this script again" -ForegroundColor White
Write-Host "   • The AppData folder will be deleted again" -ForegroundColor White
Write-Host ""
Write-Host "4. Test connection from website:" -ForegroundColor White
Write-Host "   • Should complete in 2-5 seconds" -ForegroundColor Green
Write-Host "   • No 60s timeout" -ForegroundColor Green
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
