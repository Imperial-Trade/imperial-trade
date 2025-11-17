# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 🚀 DEPLOY ALL NOTIFICATION EDGE FUNCTIONS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# This script deploys all 11 notification Edge Functions that use
# the updated _shared/notification-core.ts with Windows Notification
# Center support (persist: true, web_push_topic, etc.)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Write-Host "`n🚀 Starting deployment of notification Edge Functions..." -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan

# Check if Supabase CLI is available
$supabaseExists = Get-Command supabase -ErrorAction SilentlyContinue
if (-not $supabaseExists) {
    Write-Host "❌ ERROR: Supabase CLI not found!" -ForegroundColor Red
    Write-Host "`nPlease install Supabase CLI first:" -ForegroundColor Yellow
    Write-Host "  scoop install supabase" -ForegroundColor White
    Write-Host "`nOr download from: https://github.com/supabase/cli/releases`n" -ForegroundColor White
    exit 1
}

Write-Host "✅ Supabase CLI found: $(supabase --version)`n" -ForegroundColor Green

# Navigate to project directory
$projectPath = "C:\Users\Jacob Estayo\Trade imperial\imperial-trade"
if (Test-Path $projectPath) {
    Set-Location $projectPath
    Write-Host "✅ Project directory: $projectPath`n" -ForegroundColor Green
} else {
    Write-Host "❌ ERROR: Project directory not found: $projectPath`n" -ForegroundColor Red
    exit 1
}

# List of notification Edge Functions to deploy
$functions = @(
    "notify-signal-created",
    "notify-limit-activated",
    "notify-tp-hit",
    "notify-tp1-hit",
    "notify-tp2-hit",
    "notify-tp3-hit",
    "notify-tp4-hit",
    "notify-tp5-hit",
    "notify-stop-loss-hit",
    "notify-signal-closed",
    "notify-notes-updated"
)

Write-Host "📋 Functions to deploy: $($functions.Count)" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan

$successCount = 0
$failCount = 0
$startTime = Get-Date

foreach ($func in $functions) {
    $index = $functions.IndexOf($func) + 1
    Write-Host "[$index/$($functions.Count)] Deploying $func..." -ForegroundColor Yellow
    
    try {
        # Deploy the function
        $output = supabase functions deploy $func --no-verify-jwt 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "    ✅ $func deployed successfully" -ForegroundColor Green
            $successCount++
        } else {
            Write-Host "    ❌ $func deployment failed" -ForegroundColor Red
            Write-Host "    Error: $output" -ForegroundColor Red
            $failCount++
        }
    } catch {
        Write-Host "    ❌ $func deployment failed with exception" -ForegroundColor Red
        Write-Host "    Error: $_" -ForegroundColor Red
        $failCount++
    }
    
    Write-Host ""
}

$endTime = Get-Date
$duration = $endTime - $startTime

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🎉 DEPLOYMENT SUMMARY" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan

Write-Host "✅ Successful: $successCount" -ForegroundColor Green
Write-Host "❌ Failed: $failCount" -ForegroundColor $(if ($failCount -gt 0) { "Red" } else { "Gray" })
Write-Host "⏱️  Duration: $($duration.TotalSeconds) seconds`n" -ForegroundColor Cyan

if ($failCount -eq 0) {
    Write-Host "🎉 ALL EDGE FUNCTIONS DEPLOYED SUCCESSFULLY!" -ForegroundColor Green
    Write-Host "`n📱 Next Steps:" -ForegroundColor Cyan
    Write-Host "  1. Clear browser cache (Ctrl+Shift+Delete)" -ForegroundColor White
    Write-Host "  2. Refresh Signal Stream page (Ctrl+F5)" -ForegroundColor White
    Write-Host "  3. Create a test signal" -ForegroundColor White
    Write-Host "  4. Check Windows Notification Center (lower right)" -ForegroundColor White
    Write-Host "  5. Verify notification appears there! 🎉`n" -ForegroundColor White
} else {
    Write-Host "⚠️  SOME DEPLOYMENTS FAILED" -ForegroundColor Yellow
    Write-Host "`nPlease check the errors above and retry failed functions.`n" -ForegroundColor Yellow
}

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan

