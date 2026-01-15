# 🔧 Manual Shortcut Creation

## If You Don't See the Shortcut

**Run this in PowerShell (as Administrator):**

```powershell
# Get desktop path
$desktop = [Environment]::GetFolderPath('Desktop')

# Create shortcut
$WshShell = New-Object -ComObject WScript.Shell
$shortcutPath = Join-Path $desktop "MT5 Broker Service.lnk"

$Shortcut = $WshShell.CreateShortcut($shortcutPath)
$Shortcut.TargetPath = "C:\MT5_BrokerService\terminal64.exe"
$Shortcut.Arguments = "/portable"
$Shortcut.WorkingDirectory = "C:\MT5_BrokerService"
$Shortcut.Description = "MT5 Broker Service - Always uses isolated folder"
$Shortcut.IconLocation = "C:\MT5_BrokerService\terminal64.exe,0"
$Shortcut.Save()

Write-Host "✅ Shortcut created: $shortcutPath" -ForegroundColor Green
```

## Or Use the Script

**Run this script:**

```powershell
.\vps-setup\CREATE_MT5_SHORTCUT.ps1
```

## After Creating

1. **Refresh your desktop** (press F5 or right-click > Refresh)
2. **Look for**: `MT5 Broker Service.lnk`
3. **Double-click it** to open MT5

## Verification

After opening MT5:
1. Go to: **File > Open Data Folder**
2. **Must show**: `C:\MT5_BrokerService`
3. If it shows `AppData\Roaming`, close MT5 and try again

---

**The shortcut should appear on your Desktop after running the commands above!**
