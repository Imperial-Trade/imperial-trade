# PowerShell script to deploy all notification edge functions
# This deploys the functions with the analytics logging fix

$ErrorActionPreference = "Stop"

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "  DEPLOYING NOTIFICATION EDGE FUNCTIONS WITH FIX   " -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-Not (Test-Path "supabase\functions")) {
    Write-Host "ERROR: Must run from project root directory" -ForegroundColor Red
    exit 1
}

# List of notification functions to deploy
$functions = @(
    "notify-signal-created",
    "notify-tp-hit",
    "notify-stop-loss-hit",
    "notify-signal-closed",
    "notify-limit-activated",
    "notify-notes-updated"
)

Write-Host "Functions to deploy:" -ForegroundColor Yellow
foreach ($func in $functions) {
    Write-Host "  - $func" -ForegroundColor White
}
Write-Host ""

# Deploy each function
$successCount = 0
$failCount = 0

foreach ($func in $functions) {
    Write-Host "Deploying $func..." -ForegroundColor Cyan
    
    try {
        # Deploy using Supabase CLI
        $output = npx supabase functions deploy $func --project-ref kmuoqkcxguafxulqlbmi 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[SUCCESS] $func deployed" -ForegroundColor Green
            $successCount++
        } else {
            Write-Host "[FAILED] $func - $output" -ForegroundColor Red
            $failCount++
        }
    } catch {
        Write-Host "[ERROR] $func - $_" -ForegroundColor Red
        $failCount++
    }
    
    Write-Host ""
}

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "DEPLOYMENT SUMMARY:" -ForegroundColor Cyan
Write-Host "  Success: $successCount/$($functions.Count)" -ForegroundColor $(if ($successCount -eq $functions.Count) { "Green" } else { "Yellow" })
Write-Host "  Failed: $failCount/$($functions.Count)" -ForegroundColor $(if ($failCount -eq 0) { "Green" } else { "Red" })
Write-Host "====================================================" -ForegroundColor Cyan

if ($failCount -gt 0) {
    Write-Host ""
    Write-Host "ALTERNATIVE: Deploy via Supabase Dashboard" -ForegroundColor Yellow
    Write-Host "  1. Go to: https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/functions" -ForegroundColor White
    Write-Host "  2. Click on each function" -ForegroundColor White
    Write-Host "  3. Click 'Deploy new version'" -ForegroundColor White
    Write-Host "  4. System will auto-deploy from GitHub" -ForegroundColor White
    exit 1
}

exit 0
