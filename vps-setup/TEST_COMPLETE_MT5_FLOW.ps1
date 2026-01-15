# ============================================================================
# TEST COMPLETE MT5 FLOW - Frontend → Edge Function → VPS → MT5 → Data Back
# ============================================================================
# This script tests the complete trading software flow
# ============================================================================

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  TESTING COMPLETE MT5 FLOW" -ForegroundColor Cyan
Write-Host "  Frontend → Edge Function → VPS → MT5 → Data Back" -ForegroundColor Gray
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check MT5 Status
Write-Host "[1/7] Checking MT5 Status..." -ForegroundColor Yellow
$mt5Process = Get-Process -Name "terminal64" -ErrorAction SilentlyContinue
if ($mt5Process) {
    Write-Host "  [OK] MT5 is running (PID: $($mt5Process.Id))" -ForegroundColor Green
    $mt5Path = $mt5Process.Path
    Write-Host "  Path: $mt5Path" -ForegroundColor Gray
} else {
    Write-Host "  [ERROR] MT5 is NOT running" -ForegroundColor Red
    Write-Host "  [ACTION] Start Generic MT5 manually" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Step 2: Check Broker Service
Write-Host "[2/7] Checking Broker Service..." -ForegroundColor Yellow
$brokerStatus = pm2 list | Select-String "imperial-trade-broker-service"
if ($brokerStatus) {
    Write-Host "  [OK] Broker Service is running" -ForegroundColor Green
    $brokerInfo = pm2 describe imperial-trade-broker-service 2>&1
    $brokerInfo | Select-String -Pattern "status|pid|port" | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
} else {
    Write-Host "  [ERROR] Broker Service is NOT running" -ForegroundColor Red
    Write-Host "  [ACTION] Start with: pm2 restart imperial-trade-broker-service" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Step 3: Test Broker Service Health
Write-Host "[3/7] Testing Broker Service Health Endpoint..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-WebRequest -Uri "http://localhost:3001/health" -Method GET -TimeoutSec 5 -ErrorAction Stop
    $healthData = $healthResponse.Content | ConvertFrom-Json
    Write-Host "  [OK] Broker Service is healthy" -ForegroundColor Green
    Write-Host "  Status: $($healthData.status)" -ForegroundColor Gray
    Write-Host "  Uptime: $([math]::Round($healthData.uptime, 2)) seconds" -ForegroundColor Gray
} catch {
    Write-Host "  [ERROR] Health check failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 4: Test MT5 Connection via Broker Service (Direct Test)
Write-Host "[4/7] Testing MT5 Connection via Broker Service..." -ForegroundColor Yellow
Write-Host "  Using EC Markets Demo credentials..." -ForegroundColor Gray

# Get API key from .env
$envPath = "C:\vps-broker-service\.env"
$apiKey = $null
if (Test-Path $envPath) {
    $envContent = Get-Content $envPath
    foreach ($line in $envContent) {
        if ($line -match "^VPS_API_KEY=(.+)$") {
            $apiKey = $matches[1].Trim()
            break
        }
    }
}

if (-not $apiKey) {
    Write-Host "  [ERROR] VPS_API_KEY not found in .env file" -ForegroundColor Red
    exit 1
}

# Test connection with encrypted credentials (simulating Edge Function call)
$testBody = @{
    broker_type = "ecmarkets"
    encrypted_login = "dGVzdA=="  # Base64 encoded "test" (simplified for testing)
    encrypted_password = "dGVzdA=="
    encrypted_server = "RUNDYXJrZXRzTHRkLURlbW8="  # Base64 encoded "ECMarketsLtd-Demo"
    user_id = "test-user-id"
} | ConvertTo-Json

try {
    Write-Host "  Calling /test-connection endpoint..." -ForegroundColor Gray
    $response = Invoke-WebRequest -Uri "http://localhost:3001/test-connection" `
        -Method POST `
        -ContentType "application/json" `
        -Headers @{ "X-API-Key" = $apiKey } `
        -Body $testBody `
        -TimeoutSec 60 `
        -ErrorAction Stop
    
    Write-Host "  [OK] Broker Service responded (Status: $($response.StatusCode))" -ForegroundColor Green
    $responseData = $response.Content | ConvertFrom-Json
    Write-Host "  Response:" -ForegroundColor Gray
    $responseData | ConvertTo-Json -Depth 3 | Write-Host -ForegroundColor Gray
    
} catch {
    Write-Host "  [ERROR] Connection test failed" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "  Response: $responseBody" -ForegroundColor Yellow
    }
}
Write-Host ""

# Step 5: Check Broker Service Logs
Write-Host "[5/7] Checking Recent Broker Service Logs..." -ForegroundColor Yellow
$logs = pm2 logs imperial-trade-broker-service --lines 20 --nostream 2>&1
$recentLogs = $logs | Select-Object -Last 10
if ($recentLogs) {
    Write-Host "  Recent logs:" -ForegroundColor Gray
    $recentLogs | ForEach-Object {
        if ($_ -match "error|Error|ERROR|failed|Failed") {
            Write-Host "  ❌ $_" -ForegroundColor Red
        } elseif ($_ -match "success|Success|SUCCESS|connected|Connected") {
            Write-Host "  ✅ $_" -ForegroundColor Green
        } else {
            Write-Host "  ℹ️  $_" -ForegroundColor Gray
        }
    }
} else {
    Write-Host "  [WARNING] No recent logs found" -ForegroundColor Yellow
}
Write-Host ""

# Step 6: Test Python MT5 Script Directly
Write-Host "[6/7] Testing Python MT5 Script Directly..." -ForegroundColor Yellow
$pythonScript = "C:\vps-broker-service\python\test_connection.py"
if (Test-Path $pythonScript) {
    Write-Host "  Running Python test script..." -ForegroundColor Gray
    $testCredentials = @{
        login = "800107112"
        password = "test123"
        server = "ECMarketsLtd-Demo"
    } | ConvertTo-Json -Compress
    
    try {
        $pythonOutput = python $pythonScript $testCredentials 2>&1
        $pythonResult = $pythonOutput | ConvertFrom-Json -ErrorAction SilentlyContinue
        
        if ($pythonResult -and $pythonResult.connected) {
            Write-Host "  [OK] Python script connected successfully" -ForegroundColor Green
            Write-Host "  Account: $($pythonResult.account_info.login)" -ForegroundColor Gray
            Write-Host "  Server: $($pythonResult.server_used)" -ForegroundColor Gray
            Write-Host "  Balance: $($pythonResult.account_info.balance)" -ForegroundColor Gray
        } else {
            Write-Host "  [ERROR] Python script failed to connect" -ForegroundColor Red
            Write-Host "  Error: $($pythonResult.error)" -ForegroundColor Red
        }
    } catch {
        Write-Host "  [ERROR] Python script execution failed" -ForegroundColor Red
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "  Output: $pythonOutput" -ForegroundColor Yellow
    }
} else {
    Write-Host "  [WARNING] Python script not found: $pythonScript" -ForegroundColor Yellow
}
Write-Host ""

# Step 7: Verify Data Flow
Write-Host "[7/7] Verifying Complete Data Flow..." -ForegroundColor Yellow
Write-Host "  Flow: Frontend → Edge Function → VPS Broker Service → MT5" -ForegroundColor Gray
Write-Host "  Reverse: MT5 → VPS Broker Service → Edge Function → Frontend" -ForegroundColor Gray
Write-Host ""
Write-Host "  [INFO] To test from frontend:" -ForegroundColor Yellow
Write-Host "    1. Open Journal XX Pro in browser" -ForegroundColor White
Write-Host "    2. Go to broker connection settings" -ForegroundColor White
Write-Host "    3. Enter EC Markets Demo credentials" -ForegroundColor White
Write-Host "    4. Click 'Test Connection'" -ForegroundColor White
Write-Host "    5. Check browser console for logs" -ForegroundColor White
Write-Host ""

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  TEST COMPLETE" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Summary:" -ForegroundColor Yellow
if ($mt5Process) {
    Write-Host "  MT5 Status: [OK] Running" -ForegroundColor Green
} else {
    Write-Host "  MT5 Status: [ERROR] Not Running" -ForegroundColor Red
}
if ($brokerStatus) {
    Write-Host "  Broker Service: [OK] Running" -ForegroundColor Green
} else {
    Write-Host "  Broker Service: [ERROR] Not Running" -ForegroundColor Red
}
Write-Host ""

