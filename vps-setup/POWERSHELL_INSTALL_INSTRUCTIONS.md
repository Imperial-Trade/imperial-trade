# 📥 Install Latest PowerShell 7 on VPS

## 🚀 Quick Install (Recommended)

**Run this on VPS:**

```powershell
powershell.exe -ExecutionPolicy Bypass -File C:\vps-broker-service\vps-setup\INSTALL_LATEST_POWERSHELL.ps1
```

**Or use the quick version:**

```powershell
powershell.exe -ExecutionPolicy Bypass -File C:\vps-broker-service\vps-setup\QUICK_INSTALL_POWERSHELL.ps1
```

## 📋 Manual Installation

### **Option 1: Using winget (if available)**

```powershell
winget install --id Microsoft.PowerShell --source winget
```

### **Option 2: Download MSI directly**

1. Visit: https://aka.ms/powershell-release
2. Download: PowerShell-7.x.x-win-x64.msi
3. Run the installer
4. Check "Add PowerShell to PATH" during installation

### **Option 3: One-liner download and install**

```powershell
$url = "https://github.com/PowerShell/PowerShell/releases/latest/download/PowerShell-7.4.0-win-x64.msi"; $file = "$env:TEMP\PowerShell-7.msi"; Invoke-WebRequest -Uri $url -OutFile $file; Start-Process msiexec.exe -ArgumentList "/i `"$file`" /quiet /norestart ADD_PATH=1" -Wait; Remove-Item $file -Force
```

## ✅ Verify Installation

After installation, restart your terminal and run:

```powershell
pwsh --version
```

You should see: `PowerShell 7.x.x`

## 🔄 Using PowerShell 7

**To use PowerShell 7 instead of Windows PowerShell 5.1:**

```powershell
pwsh
```

**Or set it as default:**
- PowerShell 7 installs alongside Windows PowerShell 5.1
- Both can coexist
- Use `pwsh` to launch PowerShell 7
- Use `powershell` to launch Windows PowerShell 5.1

## 📝 Notes

- PowerShell 7 is cross-platform and has better features
- It's faster and has improved error handling
- Better SSH output handling
- Improved JSON parsing
- Better module support

---

**After installation, restart your terminal and use `pwsh` for better compatibility!**
