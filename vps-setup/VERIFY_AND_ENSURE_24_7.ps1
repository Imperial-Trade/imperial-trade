# ============================================================================
# VERIFY AND ENSURE PRICE FEEDER 24/7 CONFIGURATION
# ============================================================================
# Checks and configures all layers of protection for Price Feeder
# ============================================================================

Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🔒 VERIFYING PRICE FEEDER 24/7 CONFIGURATION" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Layer 1: PM2 Auto-Restart
Write-Host "Layer 1: PM2 Auto-Restart" -ForegroundColor Yellow
Write-Host "────────────────────────────────────────────────────────────" -ForegroundColor Gray

$pm2Info = pm2 describe "Imperial Price Feeder" 2>&1
if ($pm2Info -match "max_restarts.*999999" -or $pm2Info -match "restart time") {
    Write-Host "✅ PM2 Auto-Restart: CONFIGURED" -ForegroundColor Green
} else {
    Write-Host "⚠️  PM2 Auto-Restart: NOT CONFIGURED" -ForegroundColor Yellow
    Write-Host "   Configuring now..." -ForegroundColor Cyan
    pm2 set "Imperial Price Feeder" max_restarts 999999 | Out-Null
    pm2 set "Imperial Price Feeder" min_uptime 1000 | Out-Null
    Write-Host "   ✅ Configured!" -ForegroundColor Green
}
Write-Host ""

# Layer 2: PM2 Persistence
Write-Host "Layer 2: PM2 Persistence" -ForegroundColor Yellow
Write-Host "────────────────────────────────────────────────────────────" -ForegroundColor Gray

$dumpFile = "$env:USERPROFILE\.pm2\dump.pm2"
if (Test-Path $dumpFile) {
    Write-Host "✅ PM2 Save File: EXISTS" -ForegroundColor Green
    Write-Host "   Location: $dumpFile" -ForegroundColor Gray
} else {
    Write-Host "⚠️  PM2 Save File: MISSING" -ForegroundColor Yellow
    Write-Host "   Creating save file..." -ForegroundColor Cyan
    pm2 save | Out-Null
    Write-Host "   ✅ Created!" -ForegroundColor Green
}
Write-Host ""

# Layer 3: Windows Startup Task
Write-Host "Layer 3: Windows Startup Task" -ForegroundColor Yellow
Write-Host "────────────────────────────────────────────────────────────" -ForegroundColor Gray

$task = Get-ScheduledTask -TaskName "*Price*", "*Feeder*", "*PM2*" -ErrorAction SilentlyContinue
if ($task) {
    Write-Host "✅ Windows Startup Task: EXISTS" -ForegroundColor Green
    $task | Select-Object TaskName, State | Format-Table -AutoSize
} else {
    Write-Host "⚠️  Windows Startup Task: NOT FOUND" -ForegroundColor Yellow
    Write-Host "   Creating startup task..." -ForegroundColor Cyan
    
    $action = New-ScheduledTaskAction -Execute "node" -Argument "C:\Users\Administrator\AppData\Roaming\npm\global\node_modules\pm2\bin\pm2 resurrect"
    $trigger = New-ScheduledTaskTrigger -AtStartup
    $principal = New-ScheduledTaskPrincipal -UserId "Administrator" -RunLevel Highest
    
    try {
        Register-ScheduledTask -TaskName "ImperialPriceFeederAutoStart" -Action $action -Trigger $trigger -Principal $principal -Force | Out-Null
        Write-Host "   ✅ Created!" -ForegroundColor Green
    } catch {
        Write-Host "   ❌ Failed to create: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "   Run this script as Administrator!" -ForegroundColor Yellow
    }
}
Write-Host ""

# Layer 4: Watchdog
Write-Host "Layer 4: Watchdog" -ForegroundColor Yellow
Write-Host "────────────────────────────────────────────────────────────" -ForegroundColor Gray

$watchdogRunning = pm2 list 2>&1 | Select-String -Pattern "watchdog|Watchdog" -Quiet
if ($watchdogRunning) {
    Write-Host "✅ Watchdog: RUNNING" -ForegroundColor Green
} else {
    Write-Host "⚠️  Watchdog: NOT RUNNING" -ForegroundColor Yellow
    Write-Host "   Starting watchdog..." -ForegroundColor Cyan
    
    $watchdogPath = "C:\imperial-price-feeder\watchdogs\price-feeder-watchdog.js"
    if (Test-Path $watchdogPath) {
        pm2 start $watchdogPath --name "Price Feeder Watchdog" | Out-Null
        pm2 save | Out-Null
        Write-Host "   ✅ Started!" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Watchdog script not found: $watchdogPath" -ForegroundColor Red
    }
}
Write-Host ""

# Final Status
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📊 FINAL STATUS" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

pm2 status
Write-Host ""

Write-Host "✅ Configuration Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "PROTECTION LAYERS:" -ForegroundColor Yellow
Write-Host "  1. PM2 Auto-Restart: Restarts if crashes" -ForegroundColor White
Write-Host "  2. PM2 Persistence: Restores after PM2 restart" -ForegroundColor White
Write-Host "  3. Windows Startup: Starts on Windows boot" -ForegroundColor White
Write-Host "  4. Watchdog: Monitors and ensures it stays running" -ForegroundColor White
Write-Host ""
