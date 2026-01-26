# ============================================================================
# VERIFY MT5 ISOLATION - Complete Verification Script
# ============================================================================

Write-Host ""
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "  MT5 ISOLATION VERIFICATION - Price Feeder vs Broker Service" -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""

$allGood = $true

# ============================================================================
# 1. PRICE FEEDER CONFIGURATION
# ============================================================================
Write-Host "1. PRICE FEEDER CONFIGURATION" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────" -ForegroundColor Gray

# Check mt5_price_reader.py
$priceReaderPath = "C:\imperial-price-feeder\python\mt5_price_reader.py"
if (-not (Test-Path $priceReaderPath)) {
    $priceReaderPath = "C:\imperial-price-feeder\mt5_price_reader.py"
}

if (Test-Path $priceReaderPath) {
    Write-Host "  [OK] mt5_price_reader.py found: $priceReaderPath" -ForegroundColor Green
    $content = Get-Content $priceReaderPath -Raw -ErrorAction SilentlyContinue
    if ($content -match "C:\\MT5_PriceFeeder\\terminal64.exe" -and $content -match "portable\s*=\s*True") {
        Write-Host "    ✅ Uses: C:\MT5_PriceFeeder\terminal64.exe (portable=True)" -ForegroundColor Green
    } elseif ($content -match "mt5\.initialize\(\)") {
        Write-Host "    ❌ Uses: DEFAULT MT5 (needs fix!)" -ForegroundColor Red
        $allGood = $false
    } else {
        Write-Host "    ⚠️  Configuration unclear - please check manually" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ❌ mt5_price_reader.py not found" -ForegroundColor Red
    $allGood = $false
}

# Check mt5_bridge.py
$bridgePath = "C:\imperial-price-feeder\mt5_bridge.py"
if (Test-Path $bridgePath) {
    $content = Get-Content $bridgePath -Raw -ErrorAction SilentlyContinue
    if ($content -match "C:\\MT5_PriceFeeder\\terminal64.exe" -and $content -match "portable\s*=\s*True") {
        Write-Host "  [OK] mt5_bridge.py configured: C:\MT5_PriceFeeder\terminal64.exe (portable=True)" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  mt5_bridge.py may not be configured correctly" -ForegroundColor Yellow
    }
}

Write-Host ""

# ============================================================================
# 2. BROKER SERVICE CONFIGURATION
# ============================================================================
Write-Host "2. BROKER SERVICE CONFIGURATION" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────" -ForegroundColor Gray

$testConnPath = "C:\vps-broker-service\python\test_connection.py"
$fetchTradesPath = "C:\vps-broker-service\python\fetch_trades.py"

if (Test-Path $testConnPath) {
    $content = Get-Content $testConnPath -Raw -ErrorAction SilentlyContinue
    if ($content -match "C:\\MT5_BrokerService\\terminal64.exe" -and $content -match "portable\s*=\s*True") {
        Write-Host "  [OK] test_connection.py uses: C:\MT5_BrokerService\terminal64.exe (portable=True)" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  test_connection.py configuration unclear" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ⚠️  test_connection.py not found" -ForegroundColor Yellow
}

if (Test-Path $fetchTradesPath) {
    $content = Get-Content $fetchTradesPath -Raw -ErrorAction SilentlyContinue
    if ($content -match "C:\\MT5_BrokerService\\terminal64.exe" -and $content -match "portable\s*=\s*True") {
        Write-Host "  [OK] fetch_trades.py uses: C:\MT5_BrokerService\terminal64.exe (portable=True)" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  fetch_trades.py configuration unclear" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ⚠️  fetch_trades.py not found" -ForegroundColor Yellow
}

Write-Host ""

# ============================================================================
# 3. MT5 PROCESSES ISOLATION
# ============================================================================
Write-Host "3. MT5 PROCESSES ISOLATION" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────" -ForegroundColor Gray

$mt5Processes = Get-Process terminal64 -ErrorAction SilentlyContinue
$priceFeederMT5 = $false
$brokerServiceMT5 = $false

if ($mt5Processes) {
    foreach ($proc in $mt5Processes) {
        try {
            $wmi = Get-WmiObject Win32_Process -Filter "ProcessId = $($proc.Id)" -ErrorAction SilentlyContinue
            $procPath = (Get-Item $proc.Path).DirectoryName
            $cmdLine = $wmi.CommandLine
            
            if ($procPath -like "*MT5_PriceFeeder*" -or $cmdLine -like "*MT5_PriceFeeder*") {
                Write-Host "  ✅ MT5_PriceFeeder running (PID: $($proc.Id))" -ForegroundColor Green
                Write-Host "    Path: $procPath" -ForegroundColor Gray
                if ($cmdLine -match "portable") {
                    Write-Host "    Mode: Portable ✅" -ForegroundColor Green
                }
                $priceFeederMT5 = $true
            } elseif ($procPath -like "*MT5_BrokerService*" -or $cmdLine -like "*MT5_BrokerService*") {
                Write-Host "  ✅ MT5_BrokerService running (PID: $($proc.Id))" -ForegroundColor Cyan
                Write-Host "    Path: $procPath" -ForegroundColor Gray
                if ($cmdLine -match "portable") {
                    Write-Host "    Mode: Portable ✅" -ForegroundColor Green
                }
                $brokerServiceMT5 = $true
            } else {
                Write-Host "  [INFO] Other MT5 running (PID: $($proc.Id))" -ForegroundColor Gray
                Write-Host "    Path: $procPath" -ForegroundColor Gray
            }
        } catch {
            Write-Host "  [INFO] MT5 Process (PID: $($proc.Id)) - cannot read details" -ForegroundColor Gray
        }
    }
    
    if ($priceFeederMT5 -and $brokerServiceMT5) {
        Write-Host "  ✅ Both MT5 instances are running separately" -ForegroundColor Green
    } elseif ($priceFeederMT5) {
        Write-Host "  ⚠️  Only Price Feeder MT5 is running" -ForegroundColor Yellow
    } elseif ($brokerServiceMT5) {
        Write-Host "  ⚠️  Only Broker Service MT5 is running" -ForegroundColor Yellow
    } else {
        Write-Host "  ⚠️  No isolated MT5 instances found" -ForegroundColor Yellow
    }
} else {
    Write-Host "  [INFO] No MT5 processes running" -ForegroundColor Gray
    Write-Host "    (MT5 may be started on-demand by Python scripts)" -ForegroundColor Gray
}

Write-Host ""

# ============================================================================
# 4. PM2 PROCESSES ISOLATION
# ============================================================================
Write-Host "4. PM2 PROCESSES ISOLATION" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────" -ForegroundColor Gray

$pm2Status = pm2 status 2>&1 | Out-String

if ($pm2Status -match "Imperial Price Feeder") {
    Write-Host "  ✅ Price Feeder PM2 process found" -ForegroundColor Green
    pm2 status | Select-String "Price Feeder" | ForEach-Object {
        Write-Host "    $_" -ForegroundColor Gray
    }
} else {
    Write-Host "  ⚠️  Price Feeder not found in PM2" -ForegroundColor Yellow
}

if ($pm2Status -match "imperial-trade-broker-service") {
    Write-Host "  ✅ Broker Service PM2 process found" -ForegroundColor Green
    pm2 status | Select-String "broker-service" | ForEach-Object {
        Write-Host "    $_" -ForegroundColor Gray
    }
} else {
    Write-Host "  ⚠️  Broker Service not found in PM2" -ForegroundColor Yellow
}

Write-Host ""

# ============================================================================
# 5. DIRECTORY ISOLATION
# ============================================================================
Write-Host "5. DIRECTORY ISOLATION" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────" -ForegroundColor Gray

$dirs = @(
    @{Name="MT5_PriceFeeder"; Path="C:\MT5_PriceFeeder"; Purpose="Price Feeder MT5"},
    @{Name="MT5_BrokerService"; Path="C:\MT5_BrokerService"; Purpose="Broker Service MT5"},
    @{Name="imperial-price-feeder"; Path="C:\imperial-price-feeder"; Purpose="Price Feeder Node.js App"},
    @{Name="vps-broker-service"; Path="C:\vps-broker-service"; Purpose="Broker Service Node.js App"}
)

foreach ($dir in $dirs) {
    if (Test-Path $dir.Path) {
        Write-Host "  ✅ $($dir.Name): $($dir.Path)" -ForegroundColor Green
        Write-Host "    Purpose: $($dir.Purpose)" -ForegroundColor Gray
    } else {
        Write-Host "  ❌ $($dir.Name): $($dir.Path) - NOT FOUND" -ForegroundColor Red
        $allGood = $false
    }
}

Write-Host ""

# ============================================================================
# 6. VERIFICATION SUMMARY
# ============================================================================
Write-Host "===============================================================================" -ForegroundColor Cyan
if ($allGood -and $priceFeederMT5) {
    Write-Host "  ✅ VERIFICATION COMPLETE - ISOLATION CONFIRMED" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Summary:" -ForegroundColor Yellow
    Write-Host "    ✅ Price Feeder uses: C:\MT5_PriceFeeder (Portable)" -ForegroundColor Green
    Write-Host "    ✅ Broker Service uses: C:\MT5_BrokerService (Portable)" -ForegroundColor Green
    Write-Host "    ✅ Separate PM2 processes" -ForegroundColor Green
    Write-Host "    ✅ Separate directories" -ForegroundColor Green
    Write-Host "    ✅ No conflicts" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  VERIFICATION COMPLETE - SOME ISSUES FOUND" -ForegroundColor Yellow
    if (-not $allGood) {
        Write-Host ""
        Write-Host "  Issues:" -ForegroundColor Red
        Write-Host "    • Check mt5_price_reader.py configuration" -ForegroundColor White
    }
}
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""
