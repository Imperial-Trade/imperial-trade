# ============================================================================
# SYNC FILE NAMES - Ensure VPS files match Cursor workspace
# ============================================================================
# This script ensures all file names on VPS match the Cursor workspace
# ============================================================================

Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🔄 SYNCING FILE NAMES - VPS to Match Cursor Workspace" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$localPath = "C:\vps-broker-service\vps-setup"
$filesToCheck = @(
    "VERIFY_AND_ENSURE_24_7.ps1",
    "FIX_ALL_PATHS_AND_SEPARATION.ps1",
    "CREATE_MT5_SHORTCUT.ps1",
    "COPY_PASTE_TO_FIX_PATHS.ps1",
    "ALWAYS_OPEN_CORRECT_MT5.ps1",
    "LAUNCH_MT5_CORRECTLY.ps1",
    "SIMPLE_FIX_BACKGROUND_MT5.ps1",
    "RESTART_MT5_NOW.ps1",
    "DEPLOY_TO_VPS.ps1",
    "NUCLEAR_FIX_ERROR_32.ps1",
    "QUICK_FIX_ERROR_32.ps1",
    "FIX_MT5_ISOLATION.ps1",
    "CHECK_MT5_ISOLATION.ps1"
)

Write-Host "Checking files on VPS..." -ForegroundColor Yellow
Write-Host ""

$missingFiles = @()
$existingFiles = @()

foreach ($file in $filesToCheck) {
    $filePath = Join-Path $localPath $file
    if (Test-Path $filePath) {
        Write-Host "✅ $file" -ForegroundColor Green
        $existingFiles += $file
    } else {
        Write-Host "❌ $file (MISSING)" -ForegroundColor Red
        $missingFiles += $file
    }
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📊 SUMMARY" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Existing files: $($existingFiles.Count)" -ForegroundColor Green
Write-Host "Missing files: $($missingFiles.Count)" -ForegroundColor $(if ($missingFiles.Count -gt 0) { "Red" } else { "Green" })
Write-Host ""

if ($missingFiles.Count -gt 0) {
    Write-Host "Missing files:" -ForegroundColor Yellow
    $missingFiles | ForEach-Object { Write-Host "  - $_" -ForegroundColor Gray }
    Write-Host ""
    Write-Host "⚠️  These files need to be copied from Cursor workspace" -ForegroundColor Yellow
} else {
    Write-Host "✅ All files exist on VPS!" -ForegroundColor Green
}

Write-Host ""
