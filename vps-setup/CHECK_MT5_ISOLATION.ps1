# Check MT5 Isolation - Verify Price Feeder and Broker Service Use Separate Instances
# This script checks if both services are using the same MT5 terminal

Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🔍 Checking MT5 Isolation Between Services" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check all running MT5 processes
Write-Host "Step 1: Checking all running MT5 processes..." -ForegroundColor Yellow
$mt5Processes = Get-Process -Name terminal64 -ErrorAction SilentlyContinue

if ($mt5Processes) {
    Write-Host "Found $($mt5Processes.Count) MT5 process(es):" -ForegroundColor White
    foreach ($proc in $mt5Processes) {
        Write-Host "  PID: $($proc.Id) | Started: $($proc.StartTime) | Path: $($proc.Path)" -ForegroundColor Gray
    }
} else {
    Write-Host "  No MT5 processes running" -ForegroundColor Yellow
}
Write-Host ""

# Step 2: Check PM2 services
Write-Host "Step 2: Checking PM2 services..." -ForegroundColor Yellow
$pm2Status = pm2 jlist 2>$null | ConvertFrom-Json
if ($pm2Status) {
    $priceFeeder = $pm2Status | Where-Object { $_.name -like "*price*feeder*" -or $_.name -like "*price-feeder*" }
    $brokerService = $pm2Status | Where-Object { $_.name -like "*broker*service*" -or $_.name -like "*broker-service*" }
    
    if ($priceFeeder) {
        Write-Host "✅ Price Feeder service found:" -ForegroundColor Green
        Write-Host "   Name: $($priceFeeder.name)" -ForegroundColor Gray
        Write-Host "   Status: $($priceFeeder.pm2_env.status)" -ForegroundColor Gray
        Write-Host "   Script: $($priceFeeder.pm2_env.pm_exec_path)" -ForegroundColor Gray
    } else {
        Write-Host "⚠️  Price Feeder service not found in PM2" -ForegroundColor Yellow
    }
    
    if ($brokerService) {
        Write-Host "✅ Broker Service found:" -ForegroundColor Green
        Write-Host "   Name: $($brokerService.name)" -ForegroundColor Gray
        Write-Host "   Status: $($brokerService.pm2_env.status)" -ForegroundColor Gray
        Write-Host "   Script: $($brokerService.pm2_env.pm_exec_path)" -ForegroundColor Gray
    } else {
        Write-Host "⚠️  Broker Service not found in PM2" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  Could not get PM2 status" -ForegroundColor Yellow
}
Write-Host ""

# Step 3: Check MT5 data directories
Write-Host "Step 3: Checking MT5 data directories..." -ForegroundColor Yellow

# Generic MT5 (Broker Service)
$genericMT5Data = "$env:APPDATA\MetaQuotes\Terminal"
if (Test-Path $genericMT5Data) {
    Write-Host "✅ Generic MT5 data directory exists:" -ForegroundColor Green
    Write-Host "   Path: $genericMT5Data" -ForegroundColor Gray
    $dirs = Get-ChildItem $genericMT5Data -Directory -ErrorAction SilentlyContinue
    if ($dirs) {
        Write-Host "   Subdirectories: $($dirs.Count)" -ForegroundColor Gray
        foreach ($dir in $dirs) {
            Write-Host "     - $($dir.Name)" -ForegroundColor DarkGray
        }
    }
} else {
    Write-Host "⚠️  Generic MT5 data directory not found" -ForegroundColor Yellow
}

# EC Markets MT5 (Price Feeder) - Check if it uses a different path
$ecMarketsData = "$env:APPDATA\MetaQuotes\Terminal\ECMarkets"
if (Test-Path $ecMarketsData) {
    Write-Host "✅ EC Markets MT5 data directory exists:" -ForegroundColor Green
    Write-Host "   Path: $ecMarketsData" -ForegroundColor Gray
} else {
    Write-Host "⚠️  EC Markets MT5 data directory not found (may use same as Generic)" -ForegroundColor Yellow
}
Write-Host ""

# Step 4: Check for portable mode directories
Write-Host "Step 4: Checking for portable mode directories..." -ForegroundColor Yellow
$portableDirs = @(
    "C:\vps-broker-service\terminals",
    "C:\imperial-price-feeder\terminals",
    "C:\MT5_Portable",
    "C:\MT5_ECMarkets"
)

foreach ($dir in $portableDirs) {
    if (Test-Path $dir) {
        Write-Host "✅ Portable directory found: $dir" -ForegroundColor Green
        $subdirs = Get-ChildItem $dir -Directory -ErrorAction SilentlyContinue
        if ($subdirs) {
            Write-Host "   Subdirectories: $($subdirs.Count)" -ForegroundColor Gray
        }
    }
}
Write-Host ""

# Step 5: Check for file locks
Write-Host "Step 5: Checking for locked MT5 files..." -ForegroundColor Yellow
$mt5Files = @(
    "$env:APPDATA\MetaQuotes\Terminal\*\MQL5\Files\*",
    "$env:APPDATA\MetaQuotes\Terminal\*\bases\*"
)

$lockedFiles = 0
foreach ($pattern in $mt5Files) {
    $files = Get-ChildItem $pattern -ErrorAction SilentlyContinue
    foreach ($file in $files) {
        try {
            $stream = [System.IO.File]::Open($file.FullName, 'Open', 'Read', 'None')
            $stream.Close()
        } catch {
            $lockedFiles++
            Write-Host "   ⚠️  Locked file: $($file.FullName)" -ForegroundColor Red
        }
    }
}

if ($lockedFiles -eq 0) {
    Write-Host "✅ No locked files detected" -ForegroundColor Green
} else {
    Write-Host "⚠️  Found $lockedFiles locked file(s)" -ForegroundColor Yellow
}
Write-Host ""

# Step 6: Diagnosis
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📊 DIAGNOSIS" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

if ($mt5Processes.Count -gt 1) {
    Write-Host "⚠️  WARNING: Multiple MT5 processes detected!" -ForegroundColor Red
    Write-Host "   This could cause Error [32] if they share the same data files" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   Solution: Ensure each service uses:" -ForegroundColor Yellow
    Write-Host "   1. Separate MT5 terminals (EC Markets vs Generic)" -ForegroundColor White
    Write-Host "   2. Portable mode with isolated directories" -ForegroundColor White
    Write-Host "   3. Different data paths" -ForegroundColor White
} elseif ($mt5Processes.Count -eq 1) {
    Write-Host "✅ Only one MT5 process - Good!" -ForegroundColor Green
    Write-Host "   But verify it's the correct one (Price Feeder or Broker Service)" -ForegroundColor Yellow
} else {
    Write-Host "⚠️  No MT5 processes running" -ForegroundColor Yellow
    Write-Host "   Both services may need MT5 to be running" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Recommended Actions:" -ForegroundColor Cyan
Write-Host "1. Price Feeder: Should use EC Markets MT5 (separate terminal)" -ForegroundColor White
Write-Host "2. Broker Service: Should use Generic MT5 in portable mode" -ForegroundColor White
Write-Host "3. Run: .\FIX_MT5_ISOLATION.ps1 to ensure proper isolation" -ForegroundColor White
Write-Host ""
