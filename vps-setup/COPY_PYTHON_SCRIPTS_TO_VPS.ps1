# ============================================================================
# COPY PYTHON SCRIPTS TO VPS
# ============================================================================
# This script copies the updated Python scripts from local to VPS
# Run this from your LOCAL machine (where the repository is)

param(
    [Parameter(Mandatory=$true)]
    [string]$VPS_IP,
    
    [Parameter(Mandatory=$false)]
    [string]$VPS_User = "Administrator",
    
    [Parameter(Mandatory=$false)]
    [string]$SourceDir = "C:\Users\Jacob Estayo\Trade imperial\imperial-trade\vps-broker-service\python",
    
    [Parameter(Mandatory=$false)]
    [string]$TargetDir = "C:\vps-broker-service\python"
)

Write-Host ""
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "  COPY PYTHON SCRIPTS TO VPS" -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  VPS IP: $VPS_IP" -ForegroundColor White
Write-Host "  VPS User: $VPS_User" -ForegroundColor White
Write-Host "  Source: $SourceDir" -ForegroundColor White
Write-Host "  Target: $TargetDir" -ForegroundColor White
Write-Host ""

# Check if source directory exists
if (-not (Test-Path $SourceDir)) {
    Write-Host "  ❌ Source directory not found: $SourceDir" -ForegroundColor Red
    Write-Host "  Please verify the path is correct." -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Source directory found" -ForegroundColor Green
Write-Host ""

# Files to copy
$filesToCopy = @(
    "test_connection.py",
    "fetch_trades.py",
    "mt5_error_handler.py"
)

$copiedCount = 0
$failedCount = 0

foreach ($file in $filesToCopy) {
    $sourceFile = Join-Path $SourceDir $file
    $targetFile = "$TargetDir\$file"
    
    if (-not (Test-Path $sourceFile)) {
        Write-Host "  ⚠️  Source file not found: $file (skipping)" -ForegroundColor Yellow
        $failedCount++
        continue
    }
    
    Write-Host "  Copying $file..." -ForegroundColor Gray
    
    try {
        # Use SCP to copy file
        scp -o StrictHostKeyChecking=no "$sourceFile" "${VPS_User}@${VPS_IP}:$targetFile" 2>&1 | Out-Null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "    ✅ $file copied successfully" -ForegroundColor Green
            $copiedCount++
        } else {
            Write-Host "    ❌ Failed to copy $file" -ForegroundColor Red
            $failedCount++
        }
    } catch {
        Write-Host "    ❌ Error copying $file : $_" -ForegroundColor Red
        $failedCount++
    }
}

Write-Host ""
Write-Host "===============================================================================" -ForegroundColor Cyan
if ($failedCount -eq 0) {
    Write-Host "  ✅ ALL FILES COPIED SUCCESSFULLY" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Files copied: $copiedCount" -ForegroundColor White
    Write-Host ""
    Write-Host "  Next Steps (on VPS):" -ForegroundColor Yellow
    Write-Host "    1. Verify files: Test-Path C:\vps-broker-service\python\test_connection.py" -ForegroundColor White
    Write-Host "    2. Check timeout: Select-String -Path C:\vps-broker-service\python\test_connection.py -Pattern 'timeout=20000'" -ForegroundColor White
    Write-Host "    3. Restart service: C:\vps-setup\DEPLOY_VPS_BROKER_SERVICE.ps1" -ForegroundColor White
} else {
    Write-Host "  ⚠️  SOME FILES FAILED TO COPY" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Successfully copied: $copiedCount" -ForegroundColor White
    Write-Host "  Failed: $failedCount" -ForegroundColor Red
}
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""
