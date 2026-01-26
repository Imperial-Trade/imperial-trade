# ============================================================================
# INVESTIGATE PRICE FEEDER - Find What's Actually Running
# ============================================================================

Write-Host ""
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "  PRICE FEEDER INVESTIGATION - What's Actually Running?" -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""

$PRICE_FEEDER_DIR = "C:\imperial-price-feeder"

# Check 1: What Python scripts exist
Write-Host "1. Python Scripts Found:" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────" -ForegroundColor Gray

$scripts = @(
    "$PRICE_FEEDER_DIR\python\mt5_price_reader.py",
    "$PRICE_FEEDER_DIR\mt5_bridge.py"
)

foreach ($script in $scripts) {
    if (Test-Path $script) {
        Write-Host "  ✅ Found: $script" -ForegroundColor Green
        $file = Get-Item $script
        Write-Host "    Size: $([math]::Round($file.Length / 1KB, 2)) KB" -ForegroundColor Gray
        Write-Host "    Modified: $($file.LastWriteTime)" -ForegroundColor Gray
        
        $content = Get-Content $script -Raw -ErrorAction SilentlyContinue
        if ($content -match "mt5\.initialize\(.*path\s*=\s*r?[\"']([^\"']+)[\"']") {
            Write-Host "    MT5 Path: $($matches[1])" -ForegroundColor Cyan
            if ($content -match "portable\s*=\s*True") {
                Write-Host "    Portable: True ✅" -ForegroundColor Green
            } else {
                Write-Host "    Portable: False ⚠️" -ForegroundColor Yellow
            }
        } elseif ($content -match "mt5\.initialize\(\)") {
            Write-Host "    MT5 Path: DEFAULT (needs fix!) ❌" -ForegroundColor Red
        }
    } else {
        Write-Host "  ❌ Not Found: $script" -ForegroundColor Red
    }
}

Write-Host ""

# Check 2: What Node.js is calling (source)
Write-Host "2. Node.js Source Code:" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────" -ForegroundColor Gray

$srcIndex = "$PRICE_FEEDER_DIR\src\index.ts"
if (Test-Path $srcIndex) {
    $content = Get-Content $srcIndex -Raw
    if ($content -match "mt5_price_reader\.py") {
        Write-Host "  ✅ Source calls: mt5_price_reader.py" -ForegroundColor Green
        Write-Host "    Line: $(($content.IndexOf('mt5_price_reader') + 1) / 80 + 1)" -ForegroundColor Gray
    }
    if ($content -match "mt5_bridge\.py") {
        Write-Host "  ✅ Source calls: mt5_bridge.py" -ForegroundColor Green
    }
} else {
    Write-Host "  ⚠️  Source code not found: $srcIndex" -ForegroundColor Yellow
}

Write-Host ""

# Check 3: What Node.js is actually running (compiled)
Write-Host "3. Compiled Node.js Code:" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────" -ForegroundColor Gray

$distIndex = "$PRICE_FEEDER_DIR\dist\index.js"
if (Test-Path $distIndex) {
    $content = Get-Content $distIndex -Raw -ErrorAction SilentlyContinue
    if ($content -match "mt5_price_reader\.py") {
        Write-Host "  ✅ Compiled calls: mt5_price_reader.py" -ForegroundColor Green
    }
    if ($content -match "mt5_bridge\.py") {
        Write-Host "  ✅ Compiled calls: mt5_bridge.py" -ForegroundColor Green
    }
} else {
    Write-Host "  ⚠️  Compiled code not found: $distIndex" -ForegroundColor Yellow
    Write-Host "    (Service might be running from source)" -ForegroundColor Gray
}

Write-Host ""

# Check 4: Price Feeder process and logs
Write-Host "4. Price Feeder Process:" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────" -ForegroundColor Gray

$pm2Status = pm2 status 2>&1 | Out-String
if ($pm2Status -match "Imperial Price Feeder") {
    Write-Host "  ✅ Price Feeder is running in PM2" -ForegroundColor Green
    pm2 status | Select-String "Price Feeder" | ForEach-Object {
        Write-Host "    $_" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "  Recent Logs (last 15 lines):" -ForegroundColor Gray
    pm2 logs "Imperial Price Feeder" --lines 15 --nostream 2>&1 | Select-String -Pattern "python|mt5|ERROR|error|Connected|initialize|MT5|price" | Select-Object -Last 10 | ForEach-Object {
        Write-Host "    $_" -ForegroundColor Gray
    }
} else {
    Write-Host "  ❌ Price Feeder not running in PM2" -ForegroundColor Red
}

Write-Host ""

# Check 5: Running Python processes
Write-Host "5. Running Python Processes:" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────" -ForegroundColor Gray

$pythonProcesses = Get-Process python -ErrorAction SilentlyContinue
$pythonwProcesses = Get-Process pythonw -ErrorAction SilentlyContinue

$allPython = @()
if ($pythonProcesses) { $allPython += $pythonProcesses }
if ($pythonwProcesses) { $allPython += $pythonwProcesses }

if ($allPython.Count -gt 0) {
    foreach ($proc in $allPython) {
        try {
            $wmi = Get-WmiObject Win32_Process -Filter "ProcessId = $($proc.Id)" -ErrorAction SilentlyContinue
            $cmdLine = $wmi.CommandLine
            
            if ($cmdLine -match "mt5_price_reader") {
                Write-Host "  ✅ Running: mt5_price_reader.py (PID: $($proc.Id))" -ForegroundColor Green
                Write-Host "    Command: $($cmdLine.Substring(0, [Math]::Min(100, $cmdLine.Length)))..." -ForegroundColor Gray
            } elseif ($cmdLine -match "mt5_bridge") {
                Write-Host "  ✅ Running: mt5_bridge.py (PID: $($proc.Id))" -ForegroundColor Green
                Write-Host "    Command: $($cmdLine.Substring(0, [Math]::Min(100, $cmdLine.Length)))..." -ForegroundColor Gray
            } else {
                Write-Host "  [INFO] Python Process (PID: $($proc.Id))" -ForegroundColor Gray
                Write-Host "    Command: $($cmdLine.Substring(0, [Math]::Min(100, $cmdLine.Length)))..." -ForegroundColor Gray
            }
        } catch {
            Write-Host "  [INFO] Python Process (PID: $($proc.Id)) - cannot read command" -ForegroundColor Gray
        }
    }
} else {
    Write-Host "  [INFO] No Python processes currently running" -ForegroundColor Gray
    Write-Host "    (Python might be spawned on-demand by Node.js)" -ForegroundColor Gray
}

Write-Host ""

# Check 6: Running MT5 processes
Write-Host "6. Running MT5 Processes:" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────" -ForegroundColor Gray

$mt5Processes = Get-Process terminal64 -ErrorAction SilentlyContinue
if ($mt5Processes) {
    foreach ($proc in $mt5Processes) {
        try {
            $wmi = Get-WmiObject Win32_Process -Filter "ProcessId = $($proc.Id)" -ErrorAction SilentlyContinue
            $cmdLine = $wmi.CommandLine
            $path = (Get-Item $proc.Path).DirectoryName
            
            if ($path -like "*MT5_PriceFeeder*") {
                Write-Host "  ✅ MT5_PriceFeeder running (PID: $($proc.Id))" -ForegroundColor Green
                Write-Host "    Path: $path" -ForegroundColor Gray
                if ($cmdLine -match "portable") {
                    Write-Host "    Mode: Portable ✅" -ForegroundColor Green
                } else {
                    Write-Host "    Mode: Standard ⚠️" -ForegroundColor Yellow
                }
            } elseif ($path -like "*MT5_BrokerService*") {
                Write-Host "  ✅ MT5_BrokerService running (PID: $($proc.Id))" -ForegroundColor Cyan
                Write-Host "    Path: $path" -ForegroundColor Gray
                if ($cmdLine -match "portable") {
                    Write-Host "    Mode: Portable ✅" -ForegroundColor Green
                }
            } elseif ($path -like "*EC Markets*") {
                Write-Host "  [INFO] EC Markets MT5 running (PID: $($proc.Id))" -ForegroundColor Gray
                Write-Host "    Path: $path" -ForegroundColor Gray
            } else {
                Write-Host "  [INFO] Other MT5 running (PID: $($proc.Id))" -ForegroundColor Gray
                Write-Host "    Path: $path" -ForegroundColor Gray
            }
        } catch {
            Write-Host "  [INFO] MT5 Process (PID: $($proc.Id)) - cannot read details" -ForegroundColor Gray
        }
    }
} else {
    Write-Host "  ⚠️  No MT5 processes running" -ForegroundColor Yellow
    Write-Host "    (MT5 might be started by Python script on-demand)" -ForegroundColor Gray
}

Write-Host ""

# Check 7: Verify database prices
Write-Host "7. Recent Database Prices:" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────" -ForegroundColor Gray

Write-Host "  Checking Supabase for recent price updates..." -ForegroundColor Gray
# Note: This would require Supabase connection, can be added if needed

Write-Host ""

# Summary
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "  INVESTIGATION COMPLETE" -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. If mt5_price_reader.py uses default MT5 → Run FIX_PRICE_FEEDER_MT5_PATH.ps1" -ForegroundColor White
Write-Host "  2. Restart Price Feeder: pm2 restart 'Imperial Price Feeder'" -ForegroundColor White
Write-Host "  3. Run verification: .\VERIFY_MT5_ISOLATION.ps1" -ForegroundColor White
Write-Host ""
