# ============================================================================
# TEST ALL 3 BROKER CONNECTIONS VIA VPS SERVICE
# ============================================================================
# Tests connections directly via VPS service (bypasses Edge Function auth)
# ============================================================================

$ErrorActionPreference = "Continue"

$VPS_URL = "http://localhost:3001"
$API_KEY = "bfa602cd4a12c93cd6a0f6cab9d93ff7b0fcd4dd2392f94e48db2013d679990d"
$USER_ID = "8a2ccfdc-1efb-4979-b6a0-4e7b4883db59"

# Accounts to test (plain credentials - will be encrypted by Edge Function in production)
$Accounts = @(
    @{
        Name = "PU Prime"
        BrokerType = "PU_PRIME"
        Login = "18448879"
        Password = "wb6V8e^t"
        Server = "PUPrime-Live4"
    },
    @{
        Name = "XS"
        BrokerType = "XS"
        Login = "11321405"
        Password = "U!27bc5h"
        Server = "XSFintech-REAL-3"
    },
    @{
        Name = "EC Markets Demo"
        BrokerType = "EC_MARKETS"
        Login = "800107112"
        Password = "Demo@123"
        Server = "ECMarkets-MT5-Demo"
    }
)

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "  TESTING ALL 3 BROKER CONNECTIONS VIA VPS" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host ""

$SuccessCount = 0
$FailCount = 0

foreach ($account in $Accounts) {
    $num = $Accounts.IndexOf($account) + 1
    $total = $Accounts.Count
    
    Write-Host "================================================================================" -ForegroundColor Cyan
    Write-Host "  TEST $num/$total : $($account.Name)" -ForegroundColor Cyan
    Write-Host "================================================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "   Login: $($account.Login)" -ForegroundColor Gray
    Write-Host "   Server: $($account.Server)" -ForegroundColor Gray
    Write-Host ""
    
    try {
        Write-Host "[$num/$total] Testing connection..." -ForegroundColor Yellow
        
        # Test connection endpoint
        $body = @{
            broker_type = $account.BrokerType
            encrypted_login = $account.Login  # Plain for testing (VPS will decrypt or use as-is)
            encrypted_password = $account.Password
            encrypted_server = $account.Server
            user_id = $USER_ID
        } | ConvertTo-Json
        
        $response = Invoke-WebRequest -Uri "$VPS_URL/test-connection" `
            -Method POST `
            -Headers @{
                "Content-Type" = "application/json"
                "X-API-Key" = $API_KEY
            } `
            -Body $body `
            -TimeoutSec 30 `
            -UseBasicParsing `
            -ErrorAction Stop
        
        if ($response.StatusCode -eq 200) {
            $result = $response.Content | ConvertFrom-Json
            
            if ($result.connected) {
                Write-Host "   ✅ CONNECTION SUCCESSFUL" -ForegroundColor Green
                Write-Host "   📍 Server: $($result.server_used)" -ForegroundColor Gray
                Write-Host "   📍 Account Info: $($result.account_info | ConvertTo-Json -Compress)" -ForegroundColor Gray
                $SuccessCount++
            } else {
                Write-Host "   ❌ CONNECTION FAILED" -ForegroundColor Red
                Write-Host "   Error: $($result.error)" -ForegroundColor Red
                $FailCount++
            }
        } else {
            Write-Host "   ❌ HTTP Error: $($response.StatusCode)" -ForegroundColor Red
            $FailCount++
        }
    } catch {
        Write-Host "   ❌ ERROR: $_" -ForegroundColor Red
        $FailCount++
    }
    
    Write-Host ""
    
    # Wait between tests
    if ($num -lt $total) {
        Write-Host "Waiting 3 seconds before next test..." -ForegroundColor Gray
        Start-Sleep -Seconds 3
        Write-Host ""
    }
}

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "  TEST RESULTS SUMMARY" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Total connections tested: $($Accounts.Count)" -ForegroundColor White
Write-Host "✅ Successful: $SuccessCount" -ForegroundColor Green
Write-Host "❌ Failed: $FailCount" -ForegroundColor Red
Write-Host ""

if ($SuccessCount -eq $Accounts.Count) {
    Write-Host "🎉 ALL CONNECTIONS WORKING!" -ForegroundColor Green
    exit 0
} elseif ($SuccessCount -gt 0) {
    Write-Host "⚠️  SOME CONNECTIONS WORKING" -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "❌ ALL CONNECTIONS FAILED" -ForegroundColor Red
    exit 1
}


