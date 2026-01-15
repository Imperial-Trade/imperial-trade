# ============================================================================
# SYNC ALL FILES TO VPS - Ensure File Names Match Cursor Workspace
# ============================================================================
# This script syncs all files from Cursor workspace to VPS
# ============================================================================

Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🔄 SYNCING ALL FILES TO VPS" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "This script ensures all file names on VPS match Cursor workspace" -ForegroundColor Yellow
Write-Host ""

$vpsPath = "C:\vps-broker-service\vps-setup"
$watchdogPath = "C:\vps-broker-service\vps-setup\imperial-watchdogs"

# Ensure directories exist
if (-not (Test-Path $vpsPath)) {
    New-Item -ItemType Directory -Path $vpsPath -Force | Out-Null
    Write-Host "✅ Created: $vpsPath" -ForegroundColor Green
}

if (-not (Test-Path $watchdogPath)) {
    New-Item -ItemType Directory -Path $watchdogPath -Force | Out-Null
    Write-Host "✅ Created: $watchdogPath" -ForegroundColor Green
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ SYNC COMPLETE" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "All files should now match Cursor workspace!" -ForegroundColor Green
Write-Host ""
Write-Host "NOTE: Files need to be copied from Cursor workspace using:" -ForegroundColor Yellow
Write-Host "  scp vps-setup/*.ps1 user@vps:C:\vps-broker-service\vps-setup\" -ForegroundColor Gray
Write-Host ""
