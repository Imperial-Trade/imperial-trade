# 🗑️ Manual: Delete Other MT5 Shortcuts

## Quick Method (Right-Click Delete)

1. **On your Desktop**, find these shortcuts:
   - `EC Markets MetaTrader 5.lnk`
   - `MetaTrader 5.lnk`
   - `MetaEditor 5.lnk`

2. **Right-click each one** → **Delete**

3. **Keep only**: `MT5 Broker Service.lnk` ✅

## Or Use PowerShell

**Run this in PowerShell:**

```powershell
$desktop = [Environment]::GetFolderPath('Desktop')

# Delete other shortcuts
$others = @('EC Markets MetaTrader 5.lnk', 'MetaTrader 5.lnk', 'MetaEditor 5.lnk')

foreach ($name in $others) {
    $path = Join-Path $desktop $name
    if (Test-Path $path) {
        Remove-Item $path -Force
        Write-Host "✅ Deleted: $name" -ForegroundColor Green
    }
}

Write-Host "✅ Cleanup complete!" -ForegroundColor Green
```

## After Cleanup

**Your Desktop should have:**
- ✅ `MT5 Broker Service.lnk` (KEEP THIS ONE!)
- ❌ No other MT5 shortcuts

**Always use**: `MT5 Broker Service.lnk` to open MT5

---

**This prevents confusion and ensures you always open the correct MT5!**
