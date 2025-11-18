# Apply Pusher Beams Trigger Fix to Supabase Database
# This script executes the migration to fix the instant_notification_router trigger

Write-Host "🔧 Applying Pusher Beams Trigger Fix..." -ForegroundColor Yellow
Write-Host ""

$migrationFile = "supabase/migrations/20251118_fix_pusher_beams_trigger.sql"

if (-not (Test-Path $migrationFile)) {
    Write-Host "❌ Migration file not found: $migrationFile" -ForegroundColor Red
    exit 1
}

$sql = Get-Content -Path $migrationFile -Raw

# Supabase connection details
$env:PGPASSWORD = "Lagrimas030503."
$host = "aws-0-us-west-1.pooler.supabase.com"
$port = "5432"
$database = "postgres"
$user = "postgres.kmuoqkcxguafxulqlbmi"

Write-Host "📡 Connecting to Supabase database..." -ForegroundColor Cyan
Write-Host ""

try {
    # Execute the SQL using psql
    $output = echo $sql | psql -h $host -p $port -d $database -U $user 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ SUCCESS! Trigger fix applied successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "🎉 The instant_notification_router trigger has been updated for Pusher Beams!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Yellow
        Write-Host "1. Go to https://tradeimperial.com" -ForegroundColor White
        Write-Host "2. Create a test signal" -ForegroundColor White
        Write-Host "3. You should receive:" -ForegroundColor White
        Write-Host "   - Modern notification pop-up modal" -ForegroundColor White
        Write-Host "   - Entry in Recent Activity" -ForegroundColor White
        Write-Host "   - Push notification (if subscribed)" -ForegroundColor White
    } else {
        Write-Host "❌ FAILED: Error applying trigger fix" -ForegroundColor Red
        Write-Host ""
        Write-Host "Error output:" -ForegroundColor Red
        Write-Host $output
        exit 1
    }
} catch {
    Write-Host "❌ EXCEPTION: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install PostgreSQL client tools (psql) or use the Supabase Dashboard SQL Editor instead." -ForegroundColor Yellow
    exit 1
}

