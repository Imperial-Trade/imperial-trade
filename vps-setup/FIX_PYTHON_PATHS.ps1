# Fix all Python script paths to use MT5_BrokerService
Write-Host "=== Fixing Python Script Paths ===" -ForegroundColor Cyan
Write-Host ""

$pythonDir = "C:\vps-broker-service\python"
$oldPath = "C:\\Program Files\\MetaTrader 5\\terminal64.exe"
$newPath = "C:\\MT5_BrokerService\\terminal64.exe"

if (-not (Test-Path $pythonDir)) {
    Write-Host "ERROR: Python directory not found: $pythonDir" -ForegroundColor Red
    exit 1
}

Write-Host "Searching for old path references..." -ForegroundColor Yellow
$files = Get-ChildItem -Path $pythonDir -Filter "*.py" -Recurse

$updated = 0
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    if ($content -match [regex]::Escape($oldPath)) {
        Write-Host "  Updating: $($file.Name)" -ForegroundColor Green
        $content = $content -replace [regex]::Escape($oldPath), $newPath
        Set-Content -Path $file.FullName -Value $content -Encoding UTF8 -NoNewline
        $updated++
    }
}

Write-Host ""
Write-Host "Updated $updated Python files" -ForegroundColor Green
Write-Host ""
Write-Host "Verifying changes..." -ForegroundColor Yellow
$remaining = Get-ChildItem -Path $pythonDir -Filter "*.py" -Recurse | Select-String -Pattern [regex]::Escape($oldPath)
if ($remaining) {
    Write-Host "WARNING: Still found old path in:" -ForegroundColor Yellow
    $remaining | ForEach-Object { Write-Host "  $($_.Path):$($_.LineNumber)" -ForegroundColor Gray }
} else {
    Write-Host "✅ All paths updated successfully!" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== Done ===" -ForegroundColor Cyan
