# ============================================================================
# SYNC VPS FILES BACK TO CURSOR WORKSPACE
# ============================================================================
# This script copies files from VPS back to local Cursor workspace
# ============================================================================

param(
    [string]$VPSHost = "45.32.89.134",
    [string]$VPSUser = "Administrator",
    [string]$VPSPassword = "",
    [string]$LocalWorkspace = "C:\path\to\imperial-trade"
)

Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🔄 SYNCING VPS FILES TO CURSOR WORKSPACE" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Write-Host "This script copies files from VPS back to your local workspace" -ForegroundColor Yellow
Write-Host ""

# Files to sync (add more as needed)
$filesToSync = @(
    "C:\vps-broker-service\src\index.ts",
    "C:\vps-broker-service\src\terminal-manager.ts",
    "C:\vps-broker-service\src\mt5-client.ts",
    "C:\vps-broker-service\python\test_connection.py",
    "C:\vps-broker-service\python\fetch_trades.py"
)

Write-Host "Files to sync:" -ForegroundColor Yellow
foreach ($file in $filesToSync) {
    Write-Host "  - $file" -ForegroundColor Gray
}

Write-Host ""
Write-Host "⚠️  NOTE: This is a template script." -ForegroundColor Yellow
Write-Host "   You need to:" -ForegroundColor Yellow
Write-Host "   1. Set VPSPassword parameter" -ForegroundColor White
Write-Host "   2. Set LocalWorkspace to your actual workspace path" -ForegroundColor White
Write-Host "   3. Use scp or similar tool to copy files" -ForegroundColor White
Write-Host ""

Write-Host "Example scp command:" -ForegroundColor Cyan
Write-Host "  scp Administrator@$VPSHost`:C:/vps-broker-service/src/index.ts ./vps-broker-service/src/index.ts" -ForegroundColor Gray
Write-Host ""
