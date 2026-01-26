# ============================================================================
# DELETE OTHER MT5 SHORTCUTS
# ============================================================================
# Removes other MT5 shortcuts to prevent confusion
# KEEPS: MT5 Broker Service.lnk (the correct one)
# ============================================================================

Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🧹 Cleaning Up Other MT5 Shortcuts" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$desktop = [Environment]::GetFolderPath('Desktop')
Write-Host "Desktop: $desktop" -ForegroundColor Gray
Write-Host ""

# Verify the correct shortcut exists
Write-Host "Verifying correct shortcut..." -ForegroundColor Cyan
$correctShortcut = Join-Path $desktop "MT5 Broker Service.lnk"
if (Test-Path $correctShortcut) {
    $shortcut = (New-Object -ComObject WScript.Shell).CreateShortcut($correctShortcut)
    Write-Host "✅ MT5 Broker Service shortcut exists!" -ForegroundColor Green
    Write-Host "  Target: $($shortcut.TargetPath)" -ForegroundColor Gray
    Write-Host "  Arguments: $($shortcut.Arguments)" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "❌ MT5 Broker Service shortcut not found!" -ForegroundColor Red
    Write-Host "Please create it first using CREATE_MT5_SHORTCUT.ps1" -ForegroundColor Yellow
    exit 1
}

# Delete other shortcuts
Write-Host "Deleting other MT5 shortcuts..." -ForegroundColor Yellow
$otherShortcuts = @(
    "EC Markets MetaTrader 5.lnk",
    "MetaTrader 5.lnk",
    "MetaEditor 5.lnk"
)

$deletedCount = 0
foreach ($name in $otherShortcuts) {
    $path = Join-Path $desktop $name
    if (Test-Path $path) {
        try {
            Remove-Item $path -Force -ErrorAction Stop
            Write-Host "  ✅ Deleted: $name" -ForegroundColor Green
            $deletedCount++
        } catch {
            Write-Host "  ❌ Failed to delete: $name" -ForegroundColor Red
            Write-Host "    Error: $($_.Exception.Message)" -ForegroundColor Gray
        }
    } else {
        Write-Host "  Not found: $name" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ Cleanup Complete!" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Deleted $deletedCount shortcut(s)" -ForegroundColor Cyan
Write-Host ""
Write-Host "FROM NOW ON:" -ForegroundColor Yellow
Write-Host "• Only use: 'MT5 Broker Service.lnk' on your Desktop" -ForegroundColor White
Write-Host "• This shortcut ALWAYS opens MT5 in portable mode" -ForegroundColor White
Write-Host "• Data folder will ALWAYS be: C:\MT5_BrokerService" -ForegroundColor White
Write-Host ""
