# Remote VPS Access Guide

## 🎯 Your VPS Information

- **IP Address**: `45.32.89.134`
- **Vultr API Key**: `6NF7IFNVFDMMN7KTNP6DDJXJ7DDKD5RWNIPA`
- **Status**: Active

---

## 🔐 Access Methods

### **Method 1: Vultr Web Console (Easiest)**

1. Go to: https://my.vultr.com
2. Login with your Vultr account
3. Click on your VPS instance
4. Click **"View Console"** button
5. Browser-based RDP will open

**No additional software needed!**

---

### **Method 2: RDP Client (macOS)**

#### **Install Microsoft Remote Desktop**:
```bash
# Using Homebrew
brew install --cask microsoft-remote-desktop

# Or download from App Store
```

#### **Connect**:
1. Open Microsoft Remote Desktop
2. Click "Add PC"
3. Enter:
   - **PC Name**: `45.32.89.134`
   - **User Account**: `Administrator`
   - **Password**: (your VPS password)
4. Click "Add"
5. Double-click to connect

---

### **Method 3: PowerShell Remoting (Advanced)**

**Note**: Requires WinRM to be enabled on VPS (port 5985)

```bash
# On your Mac, install PowerShell first
brew install --cask powershell

# Then connect (requires credentials)
pwsh -Command "Invoke-Command -ComputerName 45.32.89.134 -Credential (Get-Credential) -ScriptBlock { Get-Process }"
```

---

## 📋 Quick Commands to Run on VPS

Once connected, open **PowerShell as Administrator**:

### **Check MT5 Processes**:
```powershell
Get-Process -Name "terminal64" | Format-Table Id, ProcessName, Path -AutoSize
```

### **Check PM2 Services**:
```powershell
pm2 list
pm2 logs "Imperial Price Feeder" --lines 10
pm2 logs "Imperial Broker Service" --lines 10
```

### **Check Python MT5 Library**:
```powershell
python -c "import MetaTrader5; print('MetaTrader5 version:', MetaTrader5.__version__)"
```

### **Check MT5 Paths**:
```powershell
Test-Path "C:\Program Files\EC Markets MetaTrader 5\terminal64.exe"
Test-Path "C:\Program Files\MetaTrader 5\terminal64.exe"
```

---

## 🔧 Troubleshooting Remote Access

### **Can't Connect via RDP**:

1. **Check Vultr Firewall**:
   - Go to Vultr Dashboard → Firewall
   - Ensure port 3389 (RDP) is open

2. **Check Windows Firewall**:
   ```powershell
   # On VPS (via web console)
   Get-NetFirewallRule -DisplayName "*Remote Desktop*"
   ```

3. **Verify VPS is Running**:
   - Check Vultr Dashboard
   - Ensure instance status is "Running"

---

## 📝 Next Steps

After connecting to VPS:

1. ✅ Run the verification script (from `VERIFY_MT5_ON_VPS.md`)
2. ✅ Verify EC Markets MT5 is running
3. ✅ Verify Python MT5 library is installed
4. ✅ Check PM2 services status
5. ✅ Test auto-sync without affecting price feed

---

## 🎯 Goal

Ensure:
- ✅ EC Markets MT5 runs 24/7 for live price feed
- ✅ Python MT5 library can connect to user brokers for auto-sync
- ✅ No interference between the two


