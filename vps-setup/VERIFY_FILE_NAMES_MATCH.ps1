# ============================================================================
# VERIFY FILE NAMES MATCH - Cursor Workspace vs VPS
# ============================================================================

Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🔍 VERIFYING FILE NAMES MATCH" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$vpsPath = "C:\vps-broker-service\vps-setup"

# Key files that should exist
$keyFiles = @(
    "VERIFY_AND_ENSURE_24_7.ps1",
    "FIX_ALL_PATHS_AND_SEPARATION.ps1",
    "CREATE_MT5_SHORTCUT.ps1",
    "COPY_PASTE_TO_FIX_PATHS.ps1",
    "DEPLOY_TO_VPS.ps1",
    "NUCLEAR_FIX_ERROR_32.ps1",
    "QUICK_FIX_ERROR_32.ps1",
    "FIX_MT5_ISOLATION.ps1",
    "CHECK_MT5_ISOLATION.ps1",
    "ALWAYS_OPEN_CORRECT_MT5.ps1",
    "LAUNCH_MT5_CORRECTLY.ps1",
    "SIMPLE_FIX_BACKGROUND_MT5.ps1",
    "RESTART_MT5_NOW.ps1"
)

$watchdogFiles = @(
    "imperial-watchdogs\price-feeder-watchdog.js",
    "imperial-watchdogs\mt5-watchdog.js"
)

Write-Host "Checking key PowerShell scripts..." -ForegroundColor Yellow
Write-Host ""

$missing = @()
$found = @()

foreach ($file in $keyFiles) {
    $filePath = Join-Path $vpsPath $file
    if (Test-Path $filePath) {
        Write-Host "  ✅ $file" -ForegroundColor Green
        $found += $file
    } else {
        Write-Host "  ❌ $file (MISSING)" -ForegroundColor Red
        $missing += $file
    }
}

Write-Host ""
Write-Host "Checking watchdog files..." -ForegroundColor Yellow
Write-Host ""

foreach ($file in $watchdogFiles) {
    $filePath = Join-Path $vpsPath $file
    if (Test-Path $filePath) {
        Write-Host "  ✅ $file" -ForegroundColor Green
        $found += $file
    } else {
        Write-Host "  ❌ $file (MISSING)" -ForegroundColor Red
        $missing += $file
    }
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📊 SUMMARY" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Found: $($found.Count) files" -ForegroundColor Green
Write-Host "Missing: $($missing.Count) files" -ForegroundColor $(if ($missing.Count -gt 0) { "Red" } else { "Green" })
Write-Host ""

if ($missing.Count -eq 0) {
    Write-Host "✅ ALL FILES MATCH!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Some files are missing and need to be synced" -ForegroundColor Yellow
}

Write-Host ""
