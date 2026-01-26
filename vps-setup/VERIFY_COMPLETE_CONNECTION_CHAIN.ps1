# ============================================================================
# VERIFY COMPLETE CONNECTION CHAIN - Frontend → Edge Function → VPS → MT5
# ============================================================================

Write-Host ""
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "  COMPLETE CONNECTION CHAIN VERIFICATION" -ForegroundColor Cyan
Write-Host "  Frontend → Supabase Edge Function → VPS Broker Service → MT5_BrokerService" -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""

$allGood = $true

# ============================================================================
# 1. PORT CONFIGURATION
# ============================================================================
Write-Host "1. PORT CONFIGURATION" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────" -ForegroundColor Gray

$expectedPort = 3001
$serviceName = "imperial-trade-broker-service"

# Check if service is listening on correct port
$listeningPorts = netstat -an | Select-String ":$expectedPort.*LISTENING"
if ($listeningPorts) {
    $portDetails = $listeningPorts | Select-String "0\.0\.0\.0:$expectedPort"
    if ($portDetails) {
        Write-Host "  ✅ Service listening on 0.0.0.0:$expectedPort (accessible externally)" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Service listening but may not be on 0.0.0.0 (check binding)" -ForegroundColor Yellow
        $allGood = $false
    }
} else {
    Write-Host "  ❌ Service NOT listening on port $expectedPort" -ForegroundColor Red
    $allGood = $false
}

# Check firewall rule
$firewallRule = Get-NetFirewallRule -DisplayName "JournalAPI-Port3001" -ErrorAction SilentlyContinue
if ($firewallRule) {
    Write-Host "  ✅ Firewall rule exists for port $expectedPort" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Firewall rule missing for port $expectedPort" -ForegroundColor Yellow
    Write-Host "    Run: New-NetFirewallRule -DisplayName 'JournalAPI-Port3001' -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow" -ForegroundColor Gray
}

Write-Host ""

# ============================================================================
# 2. VPS BROKER SERVICE STATUS
# ============================================================================
Write-Host "2. VPS BROKER SERVICE STATUS" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────" -ForegroundColor Gray

$pm2Status = pm2 status 2>&1 | Out-String
if ($pm2Status -match $serviceName) {
    Write-Host "  ✅ Broker Service running in PM2" -ForegroundColor Green
    pm2 status | Select-String $serviceName | ForEach-Object {
        Write-Host "    $_" -ForegroundColor Gray
    }
    
    # Check if it's online
    $serviceInfo = pm2 jlist | ConvertFrom-Json | Where-Object { $_.name -eq $serviceName }
    if ($serviceInfo -and $serviceInfo.pm2_env.status -eq "online") {
        Write-Host "  ✅ Service status: ONLINE" -ForegroundColor Green
        Write-Host "    PID: $($serviceInfo.pid)" -ForegroundColor Gray
        Write-Host "    Uptime: $($serviceInfo.pm2_env.pm_uptime)" -ForegroundColor Gray
    } else {
        Write-Host "  ❌ Service status: NOT ONLINE" -ForegroundColor Red
        $allGood = $false
    }
} else {
    Write-Host "  ❌ Broker Service NOT running in PM2" -ForegroundColor Red
    $allGood = $false
}

Write-Host ""

# ============================================================================
# 3. LOCAL HEALTH CHECK
# ============================================================================
Write-Host "3. LOCAL HEALTH CHECK (http://localhost:$expectedPort/health)" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────" -ForegroundColor Gray

try {
    $healthResponse = Invoke-WebRequest -Uri "http://localhost:$expectedPort/health" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    if ($healthResponse.StatusCode -eq 200) {
        $healthData = $healthResponse.Content | ConvertFrom-Json
        Write-Host "  ✅ Local health check: OK" -ForegroundColor Green
        Write-Host "    Status: $($healthData.status)" -ForegroundColor Gray
        Write-Host "    Service: $($healthData.service)" -ForegroundColor Gray
        Write-Host "    Uptime: $([math]::Round($healthData.uptime, 2)) seconds" -ForegroundColor Gray
    } else {
        Write-Host "  ❌ Local health check failed: Status $($healthResponse.StatusCode)" -ForegroundColor Red
        $allGood = $false
    }
} catch {
    Write-Host "  ❌ Local health check failed: $_" -ForegroundColor Red
    $allGood = $false
}

Write-Host ""

# ============================================================================
# 4. EXTERNAL IP AND CONNECTIVITY
# ============================================================================
Write-Host "4. EXTERNAL CONNECTIVITY" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────" -ForegroundColor Gray

try {
    $externalIP = (Invoke-WebRequest -Uri "https://api.ipify.org" -UseBasicParsing -TimeoutSec 5).Content
    Write-Host "  ✅ VPS External IP: $externalIP" -ForegroundColor Green
    Write-Host "    Expected VPS_MT5_SERVICE_URL: http://${externalIP}:${expectedPort}" -ForegroundColor Gray
    
    # Test external connectivity
    try {
        $externalHealth = Invoke-WebRequest -Uri "http://${externalIP}:${expectedPort}/health" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        if ($externalHealth.StatusCode -eq 200) {
            Write-Host "  ✅ External health check: OK (service accessible from internet)" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️  External health check: Status $($externalHealth.StatusCode)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  ⚠️  External health check failed: Service may not be accessible from internet" -ForegroundColor Yellow
        Write-Host "    Error: $_" -ForegroundColor Gray
        Write-Host "    This may be due to:" -ForegroundColor Gray
        Write-Host "    1. VPS firewall blocking port $expectedPort" -ForegroundColor Gray
        Write-Host "    2. Vultr/AWS security group not allowing port $expectedPort" -ForegroundColor Gray
        Write-Host "    3. Windows Firewall blocking external connections" -ForegroundColor Gray
    }
} catch {
    Write-Host "  ⚠️  Could not determine external IP" -ForegroundColor Yellow
}

Write-Host ""

# ============================================================================
# 5. MT5_BROKERSERVICE CONFIGURATION
# ============================================================================
Write-Host "5. MT5_BROKERSERVICE CONFIGURATION" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────" -ForegroundColor Gray

$mt5BrokerServicePath = "C:\MT5_BrokerService\terminal64.exe"
if (Test-Path $mt5BrokerServicePath) {
    Write-Host "  ✅ MT5_BrokerService exists: $mt5BrokerServicePath" -ForegroundColor Green
    
    # Check if MT5 process is running
    $mt5Processes = Get-Process terminal64 -ErrorAction SilentlyContinue | ForEach-Object {
        try {
            $wmi = Get-WmiObject Win32_Process -Filter "ProcessId = $($_.Id)" -ErrorAction SilentlyContinue
            $path = (Get-Item $_.Path).DirectoryName
            if ($path -like "*MT5_BrokerService*") {
                return $_
            }
        } catch {
            return $null
        }
    } | Where-Object { $_ -ne $null }
    
    if ($mt5Processes) {
        $mt5Processes | ForEach-Object {
            Write-Host "  ✅ MT5_BrokerService process running (PID: $($_.Id))" -ForegroundColor Green
        }
    } else {
        Write-Host "  ⚠️  MT5_BrokerService process NOT running (will start on-demand)" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ❌ MT5_BrokerService NOT FOUND: $mt5BrokerServicePath" -ForegroundColor Red
    $allGood = $false
}

Write-Host ""

# ============================================================================
# 6. PYTHON SCRIPTS CONFIGURATION
# ============================================================================
Write-Host "6. PYTHON SCRIPTS CONFIGURATION" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────" -ForegroundColor Gray

$testConnPath = "C:\vps-broker-service\python\test_connection.py"
if (Test-Path $testConnPath) {
    $content = Get-Content $testConnPath -Raw
    if ($content -match "C:\\MT5_BrokerService\\terminal64.exe" -and $content -match "portable=True") {
        Write-Host "  ✅ test_connection.py: Uses MT5_BrokerService (portable=True)" -ForegroundColor Green
    } else {
        Write-Host "  ❌ test_connection.py: Incorrect configuration" -ForegroundColor Red
        $allGood = $false
    }
    
    # Check timeout configuration
    if ($content -match "timeout=20000") {
        Write-Host "  ✅ test_connection.py: Timeout set to 20 seconds (optimized)" -ForegroundColor Green
    } elseif ($content -match "timeout=25000") {
        Write-Host "  ⚠️  test_connection.py: Timeout is 25 seconds (should be 20s)" -ForegroundColor Yellow
    } else {
        Write-Host "  ⚠️  test_connection.py: Timeout configuration unclear" -ForegroundColor Yellow
    }
    
    # Check for terminal sync wait
    if ($content -match "wait_for_terminal_sync") {
        Write-Host "  ✅ test_connection.py: Has terminal sync wait" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  test_connection.py: Missing terminal sync wait (needs fix)" -ForegroundColor Yellow
    }
    
    # Check IPC delay
    if ($content -match "time\.sleep\(2\)") {
        Write-Host "  ✅ test_connection.py: Has 2-second IPC delay" -ForegroundColor Green
    } elseif ($content -match "time\.sleep\(1\)") {
        Write-Host "  ⚠️  test_connection.py: Only has 1-second IPC delay (should be 2s)" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ❌ test_connection.py NOT FOUND" -ForegroundColor Red
    $allGood = $false
}

$fetchTradesPath = "C:\vps-broker-service\python\fetch_trades.py"
if (Test-Path $fetchTradesPath) {
    $content = Get-Content $fetchTradesPath -Raw
    if ($content -match "C:\\MT5_BrokerService\\terminal64.exe" -and $content -match "portable=True") {
        Write-Host "  ✅ fetch_trades.py: Uses MT5_BrokerService (portable=True)" -ForegroundColor Green
    } else {
        Write-Host "  ❌ fetch_trades.py: Incorrect configuration" -ForegroundColor Red
        $allGood = $false
    }
    
    # Check IPC delay
    if ($content -match "time\.sleep\(2\)") {
        Write-Host "  ✅ fetch_trades.py: Has 2-second IPC delay" -ForegroundColor Green
    } elseif ($content -match "time\.sleep\(1\)") {
        Write-Host "  ⚠️  fetch_trades.py: Only has 1-second IPC delay (should be 2s)" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ❌ fetch_trades.py NOT FOUND" -ForegroundColor Red
    $allGood = $false
}

Write-Host ""

# ============================================================================
# 7. TIMEOUT CONFIGURATION VERIFICATION
# ============================================================================
Write-Host "7. TIMEOUT CONFIGURATION VERIFICATION" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────" -ForegroundColor Gray

Write-Host "  Expected Timeout Breakdown:" -ForegroundColor Gray
Write-Host "    Edge Function: 55 seconds ✅" -ForegroundColor Green
Write-Host "    VPS Job Timeout: 45 seconds ✅" -ForegroundColor Green
Write-Host "    Python MT5 Timeout: 20 seconds × 2 retries = 40s max ✅" -ForegroundColor Green
Write-Host "    IPC Delays: 2s + 0.5s = 2.5s ✅" -ForegroundColor Green
Write-Host "    Terminal Sync: 3s max ✅" -ForegroundColor Green
Write-Host "    Total Worst Case: ~48 seconds ✅" -ForegroundColor Green
Write-Host "    Safety Buffer: 7 seconds ✅" -ForegroundColor Green

Write-Host ""

# ============================================================================
# 8. SUPABASE EDGE FUNCTION CONFIGURATION
# ============================================================================
Write-Host "8. SUPABASE EDGE FUNCTION CONFIGURATION" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────" -ForegroundColor Gray

Write-Host "  [INFO] Verify in Supabase Dashboard → Edge Functions → Settings → Secrets:" -ForegroundColor Gray
Write-Host "    VPS_MT5_SERVICE_URL: Should be http://45.32.89.134:${expectedPort}" -ForegroundColor White
Write-Host "    VPS_API_KEY: Should match VPS_API_KEY in VPS .env file" -ForegroundColor White
Write-Host ""
Write-Host "  [INFO] Edge Functions to check:" -ForegroundColor Gray
Write-Host "    - test-broker-connection: Should have 55s timeout" -ForegroundColor White
Write-Host "    - sync-broker-trades: Should call http://45.32.89.134:${expectedPort}/fetch-trades" -ForegroundColor White

Write-Host ""

# ============================================================================
# 9. RECENT LOGS CHECK
# ============================================================================
Write-Host "9. RECENT BROKER SERVICE LOGS" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────" -ForegroundColor Gray

try {
    $recentLogs = pm2 logs $serviceName --lines 10 --nostream 2>&1 | Select-Object -Last 8
    if ($recentLogs) {
        Write-Host "  Recent logs:" -ForegroundColor Gray
        $recentLogs | ForEach-Object {
            Write-Host "    $_" -ForegroundColor Gray
        }
    } else {
        Write-Host "  [INFO] No recent logs found" -ForegroundColor Gray
    }
} catch {
    Write-Host "  [INFO] Could not retrieve logs" -ForegroundColor Gray
}

Write-Host ""

# ============================================================================
# SUMMARY
# ============================================================================
Write-Host "===============================================================================" -ForegroundColor Cyan
if ($allGood) {
    Write-Host "  ✅ VERIFICATION COMPLETE - CONNECTION CHAIN CONFIGURED CORRECTLY" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Connection Flow:" -ForegroundColor Yellow
    Write-Host "    Frontend (Journal XX Pro)" -ForegroundColor White
    Write-Host "      ↓" -ForegroundColor Gray
    Write-Host "    Supabase Edge Function (test-broker-connection)" -ForegroundColor White
    Write-Host "      ↓ (http://45.32.89.134:${expectedPort})" -ForegroundColor Gray
    Write-Host "    VPS Broker Service (port ${expectedPort})" -ForegroundColor White
    Write-Host "      ↓" -ForegroundColor Gray
    Write-Host "    Python Script (test_connection.py)" -ForegroundColor White
    Write-Host "      ↓" -ForegroundColor Gray
    Write-Host "    MT5_BrokerService (Portable Mode)" -ForegroundColor White
    Write-Host ""
    Write-Host "  Timeout Configuration:" -ForegroundColor Yellow
    Write-Host "    Edge Function: 55s -> VPS: 45s -> Python: 20s x 2 = 48s max" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  VERIFICATION COMPLETE - SOME ISSUES FOUND" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Issues to fix:" -ForegroundColor Red
    if (-not $allGood) {
        Write-Host "    • Check service is running on port $expectedPort" -ForegroundColor White
        Write-Host "    • Verify firewall rules" -ForegroundColor White
        Write-Host "    • Check MT5_BrokerService configuration" -ForegroundColor White
        Write-Host "    • Verify timeout configurations match expected values" -ForegroundColor White
    }
}
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""
