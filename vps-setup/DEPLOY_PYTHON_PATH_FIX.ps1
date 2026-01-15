# Deploy Python Path Fix to VPS
Write-Host "=== Deploying Python Path Fix ===" -ForegroundColor Cyan
Write-Host ""

$pythonDir = "C:\vps-broker-service\python"
$filesToUpdate = @(
    "get_servers.py"
)

Write-Host "Updating Python scripts..." -ForegroundColor Yellow

foreach ($file in $filesToUpdate) {
    $filePath = Join-Path $pythonDir $file
    if (Test-Path $filePath) {
        Write-Host "  Updating: $file" -ForegroundColor Green
        $content = Get-Content $filePath -Raw -Encoding UTF8
        $content = $content -replace "C:\\Program Files\\MetaTrader 5\\terminal64.exe", "C:\MT5_BrokerService\terminal64.exe"
        Set-Content -Path $filePath -Value $content -Encoding UTF8 -NoNewline
    } else {
        Write-Host "  WARNING: File not found: $file" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "✅ Python path fixes deployed!" -ForegroundColor Green
Write-Host ""
Write-Host "Verifying main scripts..." -ForegroundColor Yellow
$mainScripts = @("test_connection.py", "fetch_trades.py")
foreach ($script in $mainScripts) {
    $scriptPath = Join-Path $pythonDir $script
    if (Test-Path $scriptPath) {
        $content = Get-Content $scriptPath -Raw -Encoding UTF8
        if ($content -match "C:\\MT5_BrokerService\\terminal64.exe") {
            Write-Host "  ✅ $script - Correct path" -ForegroundColor Green
        } else {
            Write-Host "  ❌ $script - Still has old path!" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "=== Done ===" -ForegroundColor Cyan
