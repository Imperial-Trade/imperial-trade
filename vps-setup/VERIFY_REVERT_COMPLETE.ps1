# Verify Everything is Reverted to Working State
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🔍 VERIFYING REVERT TO WORKING STATE" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Check Python Scripts
Write-Host "1. PYTHON SCRIPTS:" -ForegroundColor Yellow
Write-Host "────────────────────────────────────────────────────────────" -ForegroundColor Gray
$pythonScripts = @(
    "C:\vps-broker-service\python\test_connection.py",
    "C:\vps-broker-service\python\fetch_trades.py",
    "C:\vps-broker-service\python\get_servers.py"
)

$allReverted = $true
foreach ($script in $pythonScripts) {
    if (Test-Path $script) {
        $content = Get-Content $script -Raw
        $scriptName = Split-Path $script -Leaf
        
        # Check for OLD path (should NOT be there)
        if ($content -match "C:\\MT5_BrokerService\\terminal64.exe") {
            Write-Host "  ❌ $scriptName - STILL HAS MT5_BrokerService PATH!" -ForegroundColor Red
            $allReverted = $false
        }
        # Check for CORRECT path (should be there)
        elseif ($content -match "C:\\Program Files\\MetaTrader 5\\terminal64.exe") {
            Write-Host "  ✅ $scriptName - Using STANDARD path (REVERTED)" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️  $scriptName - Path not found" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  ❌ $scriptName - FILE NOT FOUND" -ForegroundColor Red
        $allReverted = $false
    }
}
Write-Host ""

# Check Terminal Manager
Write-Host "2. TERMINAL MANAGER:" -ForegroundColor Yellow
Write-Host "────────────────────────────────────────────────────────────" -ForegroundColor Gray
$terminalManager = "C:\vps-broker-service\dist\terminal-manager.js"
if (Test-Path $terminalManager) {
    $content = Get-Content $terminalManager -Raw
    
    # Check for OLD path (should NOT be there)
    if ($content -match "C:\\\\MT5_BrokerService\\\\terminal64.exe") {
        Write-Host "  ❌ terminal-manager.js - STILL HAS MT5_BrokerService PATH!" -ForegroundColor Red
        Write-Host "     NEEDS REBUILD!" -ForegroundColor Yellow
        $allReverted = $false
    }
    # Check for CORRECT path (should be there)
    elseif ($content -match "C:\\\\Program Files\\\\MetaTrader 5\\\\terminal64.exe") {
        Write-Host "  ✅ terminal-manager.js - Using STANDARD path (REVERTED)" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  terminal-manager.js - Path not found" -ForegroundColor Yellow
    }
    
    # Check data path
    if ($content -match "C:\\\\MT5_BrokerService") {
        Write-Host "  ❌ terminal-manager.js - STILL HAS MT5_BrokerService DATA PATH!" -ForegroundColor Red
        $allReverted = $false
    }
    elseif ($content -match "C:\\\\MT5_Terminals") {
        Write-Host "  ✅ terminal-manager.js - Using STANDARD data path (REVERTED)" -ForegroundColor Green
    }
} else {
    Write-Host "  ❌ terminal-manager.js - FILE NOT FOUND (needs build)" -ForegroundColor Red
    $allReverted = $false
}
Write-Host ""

# Check Source TypeScript
Write-Host "3. SOURCE TYPESCRIPT:" -ForegroundColor Yellow
Write-Host "────────────────────────────────────────────────────────────" -ForegroundColor Gray
$tsFile = "C:\vps-broker-service\src\terminal-manager.ts"
if (Test-Path $tsFile) {
    $content = Get-Content $tsFile -Raw
    
    if ($content -match "C:\\\\MT5_BrokerService\\\\terminal64.exe") {
        Write-Host "  ❌ terminal-manager.ts - STILL HAS MT5_BrokerService PATH!" -ForegroundColor Red
        $allReverted = $false
    }
    elseif ($content -match "C:\\\\Program Files\\\\MetaTrader 5\\\\terminal64.exe") {
        Write-Host "  ✅ terminal-manager.ts - Using STANDARD path (REVERTED)" -ForegroundColor Green
    }
    
    if ($content -match "C:\\\\MT5_BrokerService") {
        Write-Host "  ❌ terminal-manager.ts - STILL HAS MT5_BrokerService DATA PATH!" -ForegroundColor Red
        $allReverted = $false
    }
    elseif ($content -match "C:\\\\MT5_Terminals") {
        Write-Host "  ✅ terminal-manager.ts - Using STANDARD data path (REVERTED)" -ForegroundColor Green
    }
} else {
    Write-Host "  ❌ terminal-manager.ts - FILE NOT FOUND" -ForegroundColor Red
    $allReverted = $false
}
Write-Host ""

# Check Broker Service Status
Write-Host "4. BROKER SERVICE STATUS:" -ForegroundColor Yellow
Write-Host "────────────────────────────────────────────────────────────" -ForegroundColor Gray
$brokerService = pm2 list 2>&1 | Select-String -Pattern "imperial-trade-broker-service"
if ($brokerService) {
    Write-Host "  ✅ Broker Service: RUNNING" -ForegroundColor Green
} else {
    Write-Host "  ❌ Broker Service: NOT RUNNING" -ForegroundColor Red
    Write-Host "     Run: pm2 restart imperial-trade-broker-service" -ForegroundColor Yellow
}
Write-Host ""

# Final Summary
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📊 REVERT STATUS" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

if ($allReverted) {
    Write-Host "✅ ALL FILES REVERTED TO WORKING STATE" -ForegroundColor Green
    Write-Host ""
    Write-Host "NEXT STEPS:" -ForegroundColor Yellow
    Write-Host "  1. Rebuild: cd C:\vps-broker-service && npm run build" -ForegroundColor White
    Write-Host "  2. Restart: pm2 restart imperial-trade-broker-service" -ForegroundColor White
} else {
    Write-Host "❌ SOME FILES STILL NEED REVERTING" -ForegroundColor Red
    Write-Host ""
    Write-Host "ACTION REQUIRED:" -ForegroundColor Yellow
    Write-Host "  - Check files marked with ❌ above" -ForegroundColor White
    Write-Host "  - Revert them to use: C:\Program Files\MetaTrader 5\terminal64.exe" -ForegroundColor White
    Write-Host "  - Data path should be: C:\MT5_Terminals" -ForegroundColor White
}
Write-Host ""
