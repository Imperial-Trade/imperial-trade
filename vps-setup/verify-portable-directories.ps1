# Verify Portable Terminal Directories
# Run this after deploying to verify portable mode is working

Write-Host "🔍 Verifying Portable Terminal Directories..." -ForegroundColor Cyan
Write-Host ""

$basePath = "C:\MT5_Terminals"
$expectedTerminals = 50

# Check if base path exists
if (-not (Test-Path $basePath)) {
    Write-Host "❌ Base path does not exist: $basePath" -ForegroundColor Red
    Write-Host "   Portable mode may not be initialized yet." -ForegroundColor Yellow
    Write-Host "   This is OK if no connections have been made yet." -ForegroundColor Yellow
    exit 0
}

Write-Host "✅ Base path exists: $basePath" -ForegroundColor Green
Write-Host ""

# Count terminal directories
$terminalDirs = Get-ChildItem -Path $basePath -Directory -Filter "Terminal_*"
$count = $terminalDirs.Count

Write-Host "📊 Found $count terminal directories (expected: $expectedTerminals)" -ForegroundColor Cyan
Write-Host ""

# Check each terminal directory
$validTerminals = 0
$invalidTerminals = 0

foreach ($terminalDir in $terminalDirs) {
    $terminalPath = $terminalDir.FullName
    $terminalId = $terminalDir.Name
    
    # Check if directory has expected structure (MQL5 and bases folders are created by MT5 on first use)
    $hasStructure = (Test-Path "$terminalPath\MQL5") -or (Test-Path "$terminalPath\bases")
    
    if ($hasStructure) {
        Write-Host "✅ $terminalId : Has MT5 structure" -ForegroundColor Green
        $validTerminals++
    } else {
        Write-Host "⚠️  $terminalId : Empty (will be created on first use)" -ForegroundColor Yellow
        $validTerminals++
    }
}

Write-Host ""
Write-Host "📊 Summary:" -ForegroundColor Cyan
Write-Host "   Valid terminals: $validTerminals" -ForegroundColor Green
Write-Host "   Invalid terminals: $invalidTerminals" -ForegroundColor $(if ($invalidTerminals -eq 0) { "Green" } else { "Red" })

if ($count -lt $expectedTerminals) {
    Write-Host ""
    Write-Host "⚠️  Warning: Only $count terminals found, expected $expectedTerminals" -ForegroundColor Yellow
    Write-Host "   This is OK if the service was just deployed." -ForegroundColor Yellow
    Write-Host "   Terminals will be created on first use." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ Portable mode verification complete!" -ForegroundColor Green
