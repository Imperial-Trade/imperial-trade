# 🚀 Run This on VPS NOW

## Quick Fix - Create Shortcut

**Open PowerShell (as Administrator) and run:**

```powershell
cd C:\vps-broker-service\vps-setup
.\CREATE_MT5_SHORTCUT.ps1
```

## Or Copy-Paste This Directly:

```powershell
# Create shortcut on Desktop
$desktop = [Environment]::GetFolderPath('Desktop')
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
Write-Host "Refresh your desktop (F5) to see it!" -ForegroundColor Cyan
```

## After Running

1. **Press F5** on your desktop to refresh
2. **Look for**: `MT5 Broker Service.lnk`
3. **Double-click it** to open MT5

---

**This will create the shortcut on your Desktop!**
