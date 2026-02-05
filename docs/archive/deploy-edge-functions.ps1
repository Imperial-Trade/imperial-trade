# PowerShell script to deploy all notification edge functions
# Run this from the imperial-trade directory

Write-Host "🚀 Deploying All Notification Edge Functions..." -ForegroundColor Cyan
Write-Host ""

# Check if Supabase CLI is installed
if (!(Get-Command supabase -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Supabase CLI not found!" -ForegroundColor Red
    Write-Host "Please install it first: https://supabase.com/docs/guides/cli" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Quick install:" -ForegroundColor Yellow
    Write-Host "  npm install -g supabase" -ForegroundColor White
    exit 1
}

Write-Host "✅ Supabase CLI found" -ForegroundColor Green
Write-Host ""

# Array of functions to deploy
$functions = @(
    "notify-signal-created",
    "notify-tp-hit",
    "notify-stop-loss-hit",
    "notify-signal-closed",
    "notify-limit-activated",
    "notify-notes-updated"
)

$deployed = 0
$failed = 0

foreach ($func in $functions) {
    Write-Host "📤 Deploying: $func..." -ForegroundColor Cyan
    
    try {
        supabase functions deploy $func
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ $func deployed successfully!" -ForegroundColor Green
            $deployed++
        } else {
            Write-Host "❌ $func deployment failed" -ForegroundColor Red
            $failed++
        }
    } catch {
        Write-Host "❌ $func deployment failed: $_" -ForegroundColor Red
        $failed++
    }
    
    Write-Host ""
}

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📊 DEPLOYMENT SUMMARY" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✅ Deployed: $deployed / $($functions.Count)" -ForegroundColor Green
if ($failed -gt 0) {
    Write-Host "❌ Failed: $failed" -ForegroundColor Red
}
Write-Host ""

if ($deployed -eq $functions.Count) {
    Write-Host "🎉 ALL FUNCTIONS DEPLOYED SUCCESSFULLY!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Clear your browser localStorage" -ForegroundColor White
    Write-Host "  2. Log out and log back in" -ForegroundColor White
    Write-Host "  3. Airbnb modal should appear after 2 seconds" -ForegroundColor White
    Write-Host "  4. Click 'Yes, notify me'" -ForegroundColor White
    Write-Host "  5. Create a test trade alert" -ForegroundColor White
    Write-Host "  6. Receive push notification! 🎉" -ForegroundColor White
} else {
    Write-Host "⚠️ Some functions failed to deploy. Please check the errors above." -ForegroundColor Yellow
}

Write-Host ""

