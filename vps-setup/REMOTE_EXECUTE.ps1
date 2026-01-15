# ============================================================================
# REMOTE EXECUTION - Downloads and runs setup script on VPS
# ============================================================================
# This script can be downloaded and executed remotely
# Or executed via One-Liner command
# ============================================================================

$setupScriptUrl = "https://raw.githubusercontent.com/your-repo/main/vps-setup/RUN_ALL_ON_VPS.ps1"
$setupScriptPath = "$env:TEMP\vps-setup.ps1"

Write-Host "Downloading setup script..." -ForegroundColor Yellow
try {
    Invoke-WebRequest -Uri $setupScriptUrl -OutFile $setupScriptPath -UseBasicParsing
    Write-Host "✅ Script downloaded" -ForegroundColor Green
    
    Write-Host "Executing setup script..." -ForegroundColor Yellow
    Set-ExecutionPolicy Bypass -Scope Process -Force
    & $setupScriptPath
} catch {
    Write-Host "❌ Failed to download/execute script: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Alternative: Copy RUN_ALL_ON_VPS.ps1 content manually and paste into PowerShell" -ForegroundColor Yellow
}




