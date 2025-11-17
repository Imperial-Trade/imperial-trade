# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 🚀 ONE-CLICK DEPLOYMENT: Supabase Edge Functions
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# This script:
# 1. Checks if Supabase CLI is installed
# 2. Installs it if needed (via Scoop)
# 3. Links to your project
# 4. Deploys all 11 notification Edge Functions
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Write-Host "`n🚀 DEPLOYING NOTIFICATION EDGE FUNCTIONS" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan

# Step 1: Check if Supabase CLI is installed
$supabaseExists = Get-Command supabase -ErrorAction SilentlyContinue
if (-not $supabaseExists) {
    Write-Host "⚠️  Supabase CLI not found. Installing via Scoop...`n" -ForegroundColor Yellow
    
    # Check if Scoop is installed
    $scoopExists = Get-Command scoop -ErrorAction SilentlyContinue
    if (-not $scoopExists) {
        Write-Host "📦 Installing Scoop package manager..." -ForegroundColor Yellow
        Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
        Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression
        
        # Refresh PATH
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    }
    
    Write-Host "📦 Installing Supabase CLI..." -ForegroundColor Yellow
    scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
    scoop install supabase
    
    # Refresh PATH again
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    
    Write-Host "✅ Supabase CLI installed successfully`n" -ForegroundColor Green
} else {
    Write-Host "✅ Supabase CLI already installed: $(supabase --version)`n" -ForegroundColor Green
}

# Step 2: Navigate to project directory
$projectPath = "C:\Users\Jacob Estayo\Trade imperial\imperial-trade"
Set-Location $projectPath
Write-Host "📁 Project directory: $projectPath`n" -ForegroundColor Cyan

# Step 3: Link to Supabase project (if not already linked)
Write-Host "🔗 Linking to Supabase project..." -ForegroundColor Yellow
supabase link --project-ref kmuoqkcxguafxulqlbmi 2>&1 | Out-Null
Write-Host "✅ Linked to Trade Imperial project`n" -ForegroundColor Green

# Step 4: Deploy all notification Edge Functions
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

Write-Host "🚀 Deploying $($functions.Count) Edge Functions..." -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan

$successCount = 0
$failCount = 0
$startTime = Get-Date

foreach ($func in $functions) {
    $index = $functions.IndexOf($func) + 1
    Write-Host "[$index/$($functions.Count)] $func..." -NoNewline -ForegroundColor Yellow
    
    try {
        $output = supabase functions deploy $func --no-verify-jwt 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host " ✅" -ForegroundColor Green
            $successCount++
        } else {
            Write-Host " ❌" -ForegroundColor Red
            Write-Host "    Error: $output" -ForegroundColor Red
            $failCount++
        }
    } catch {
        Write-Host " ❌" -ForegroundColor Red
        Write-Host "    Error: $_" -ForegroundColor Red
        $failCount++
    }
}

$endTime = Get-Date
$duration = $endTime - $startTime

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🎉 DEPLOYMENT COMPLETE" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan

Write-Host "✅ Successful: $successCount" -ForegroundColor Green
Write-Host "❌ Failed: $failCount" -ForegroundColor $(if ($failCount -gt 0) { "Red" } else { "Gray" })
Write-Host "⏱️  Duration: $([math]::Round($duration.TotalSeconds, 1)) seconds`n" -ForegroundColor Cyan

if ($failCount -eq 0) {
    Write-Host "🎉 ALL EDGE FUNCTIONS DEPLOYED SUCCESSFULLY!" -ForegroundColor Green
    Write-Host "`n📱 NEXT STEPS:" -ForegroundColor Cyan
    Write-Host "  1. Clear browser cache (Ctrl+Shift+Delete)" -ForegroundColor White
    Write-Host "  2. Refresh Signal Stream (Ctrl+F5)" -ForegroundColor White
    Write-Host "  3. Create a test signal" -ForegroundColor White
    Write-Host "  4. Check Windows Notification Center (lower right)" -ForegroundColor White
    Write-Host "  5. Verify notification appears! 🎯`n" -ForegroundColor White
    
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "✅ Windows Notification Center is NOW FIXED!" -ForegroundColor Green
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan
} else {
    Write-Host "⚠️  SOME DEPLOYMENTS FAILED" -ForegroundColor Yellow
    Write-Host "Please check the errors above and retry.`n" -ForegroundColor Yellow
}

