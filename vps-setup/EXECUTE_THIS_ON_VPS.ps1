# ============================================================================
# EXECUTE THIS ON VPS - Complete Status Check
# ============================================================================
# Run this directly on VPS to see actual status
# ============================================================================

Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📊 COMPLETE STATUS CHECK" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$errors = @()
$success = @()

# Files
Write-Host "1. CHECKING FILES:" -ForegroundColor Yellow
$files = @(
    @{Name="SUCCESSFUL_VERIFICATION.ps1"; Path="C:\vps-broker-service\vps-setup\SUCCESSFUL_VERIFICATION.ps1"},
    @{Name="DIAGNOSE_FAILURE.ps1"; Path="C:\vps-broker-service\vps-setup\DIAGNOSE_FAILURE.ps1"},
    @{Name="index.js"; Path="C:\vps-broker-service\dist\index.js"},
    @{Name="test_connection.py"; Path="C:\vps-broker-service\python\test_connection.py"},
    @{Name="MT5 terminal64.exe"; Path="C:\MT5_BrokerService\terminal64.exe"}
)

foreach ($file in $files) {
    if (Test-Path $file.Path) {
        Write-Host "   ✅ $($file.Name)" -ForegroundColor Green
        $success += $file.Name
    } else {
        Write-Host "   ❌ $($file.Name) - MISSING" -ForegroundColor Red
        $errors += "$($file.Name) missing"
    }
}

Write-Host ""

# PM2
Write-Host "2. CHECKING PM2:" -ForegroundColor Yellow
try {
    $pm2 = pm2 status 2>&1
    Write-Host $pm2
    if ($pm2 -match "imperial-trade-broker-service.*online") {
        Write-Host "   ✅ Broker Service: ONLINE" -ForegroundColor Green
        $success += "Broker Service"
    } else {
        Write-Host "   ❌ Broker Service: NOT ONLINE" -ForegroundColor Red
        $errors += "Broker Service not online"
    }
} catch {
    Write-Host "   ❌ PM2 Error: $_" -ForegroundColor Red
    $errors += "PM2 error: $_"
}

Write-Host ""

# Port
Write-Host "3. CHECKING PORT 3001:" -ForegroundColor Yellow
try {
    $port = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
    if ($port) {
        Write-Host "   ✅ LISTENING" -ForegroundColor Green
        $success += "Port 3001"
    } else {
        Write-Host "   ❌ NOT LISTENING" -ForegroundColor Red
        $errors += "Port 3001 not listening"
    }
} catch {
    Write-Host "   ❌ Port check error: $_" -ForegroundColor Red
    $errors += "Port check error"
}

Write-Host ""

# MT5
Write-Host "4. CHECKING MT5:" -ForegroundColor Yellow
try {
    $mt5 = Get-Process -Name terminal64 -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*MT5_BrokerService*" }
    if ($mt5) {
        Write-Host "   ✅ RUNNING" -ForegroundColor Green
        Write-Host "   Path: $($mt5.Path)" -ForegroundColor Gray
        $success += "MT5 Process"
    } else {
        Write-Host "   ❌ NOT RUNNING" -ForegroundColor Red
        $errors += "MT5 not running"
    }
} catch {
    Write-Host "   ❌ MT5 check error: $_" -ForegroundColor Red
    $errors += "MT5 check error"
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📊 SUMMARY" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Write-Host "✅ SUCCESS: $($success.Count) items" -ForegroundColor Green
$success | ForEach-Object { Write-Host "   - $_" -ForegroundColor Gray }

Write-Host ""
Write-Host "❌ ERRORS: $($errors.Count) issues" -ForegroundColor $(if ($errors.Count -eq 0) { "Green" } else { "Red" })
if ($errors.Count -gt 0) {
    $errors | ForEach-Object { Write-Host "   - $_" -ForegroundColor Red }
} else {
    Write-Host "   - None! Everything is working!" -ForegroundColor Green
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan

if ($errors.Count -eq 0) {
    Write-Host "✅ ALL CHECKS PASSED - SYSTEM READY!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "❌ ISSUES FOUND - FIX ABOVE" -ForegroundColor Red
    exit 1
}
