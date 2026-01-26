# ============================================================================
# VERIFY PRICES IN DATABASE - Check if prices are reaching Supabase
# ============================================================================

Write-Host ""
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "  VERIFYING PRICES IN SUPABASE DATABASE" -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "https://kmuoqkcxguafxulqlbmi.supabase.co/rest/v1"
$key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW9xa2N4Z3VhZnh1bHFsYm1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjU5NzI0MDAsImV4cCI6MjA0MTU0ODQwMH0.7qJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJq"
$headers = @{
    "apikey" = $key
    "Authorization" = "Bearer $key"
}

# Check recent prices
Write-Host "Checking recent prices (last 30 seconds)..." -ForegroundColor Yellow
$thirtySecondsAgo = (Get-Date).AddSeconds(-30).ToString("yyyy-MM-ddTHH:mm:ssZ")
$url = "$baseUrl/market_prices?updated_at=gt.$thirtySecondsAgo&select=symbol,mid,bid,ask,updated_at&order=updated_at.desc&limit=5"

try {
    $response = Invoke-RestMethod -Uri $url -Headers $headers -ErrorAction Stop
    
    if ($response.Count -gt 0) {
        Write-Host "  ✅ Found $($response.Count) recent prices:" -ForegroundColor Green
        $response | ForEach-Object {
            $age = [Math]::Round(((Get-Date) - [DateTime]::Parse($_.updated_at)).TotalSeconds)
            Write-Host "    $($_.symbol): mid=$($_.mid) bid=$($_.bid) ask=$($_.ask) ($age seconds ago)" -ForegroundColor Gray
        }
    } else {
        Write-Host "  ⚠️ No recent prices (last 30 seconds)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Checking XAUUSD specifically..." -ForegroundColor Yellow
$url2 = "$baseUrl/market_prices?symbol=eq.XAUUSD&select=symbol,mid,bid,ask,updated_at&order=updated_at.desc&limit=1"

try {
    $response2 = Invoke-RestMethod -Uri $url2 -Headers $headers -ErrorAction Stop
    
    if ($response2.Count -gt 0) {
        $age = [Math]::Round(((Get-Date) - [DateTime]::Parse($response2[0].updated_at)).TotalSeconds)
        Write-Host "  ✅ XAUUSD: mid=$($response2[0].mid) bid=$($response2[0].bid) ask=$($response2[0].ask) ($age seconds ago)" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️ XAUUSD not found in database" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Checking BTCUSD specifically..." -ForegroundColor Yellow
$url3 = "$baseUrl/market_prices?symbol=eq.BTCUSD&select=symbol,mid,bid,ask,updated_at&order=updated_at.desc&limit=1"

try {
    $response3 = Invoke-RestMethod -Uri $url3 -Headers $headers -ErrorAction Stop
    
    if ($response3.Count -gt 0) {
        $age = [Math]::Round(((Get-Date) - [DateTime]::Parse($response3[0].updated_at)).TotalSeconds)
        Write-Host "  ✅ BTCUSD: mid=$($response3[0].mid) bid=$($response3[0].bid) ask=$($response3[0].ask) ($age seconds ago)" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️ BTCUSD not found in database" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "  VERIFICATION COMPLETE" -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""
