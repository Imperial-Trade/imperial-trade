# 🚀 EXECUTE COMPLETE VPS ENVIRONMENT SETUP

## ✅ Live Price System Status

**VERIFIED**: Live price system is **WORKING**! ✅
- ✅ Prices updating in database (last 1-2 seconds)
- ✅ U30USD, BTCUSD, NDXUSD, XAUUSD, SPXUSD all active
- ✅ Price Feeder is sending data successfully

---

## 📋 What This Script Installs

This comprehensive setup script installs **EVERYTHING** needed for trading app development:

### Runtime Environments:
1. ✅ **Node.js LTS** - JavaScript runtime
2. ✅ **Python 3** - Python runtime with trading packages (MetaTrader5, pandas, numpy, ta-lib)
3. ✅ **Deno** - Modern JavaScript/TypeScript runtime
4. ✅ **PM2** - Process manager with Windows startup support
5. ✅ **Git** - Version control

### Remote Access:
6. ✅ **WinRM** - PowerShell Remoting (Port 5985)
7. ✅ **OpenSSH Server** - SSH access (Port 22)

### Build Tools:
8. ✅ **Visual C++ Build Tools** - For native Node.js modules
9. ✅ **Windows SDK** - For Windows development

### Process Management:
10. ✅ **Watchdog Scripts** - Auto-restart for Price Feeder and MT5
11. ✅ **PM2 Startup** - Auto-start services on boot

---

## ⚡ Quick Execution Steps

### Step 1: Connect to VPS

**Easiest Method: Vultr Web Console**
1. Go to: https://my.vultr.com
2. Login
3. Click on your VPS instance (45.32.89.134)
4. Click **"View Console"** button
5. Browser-based RDP will open

**OR use RDP**:
- PC Name: `45.32.89.134:3389`
- Username: `Administrator`
- Password: `2#bWj}tv=}5d}u5}`

---

### Step 2: Open PowerShell as Administrator

1. Right-click on **PowerShell** icon
2. Select **"Run as Administrator"**
3. Click "Yes" on UAC prompt

---

### Step 3: Copy and Execute Setup Script

1. **Open the file**: `vps-setup/COMPLETE_VPS_ENVIRONMENT_SETUP.ps1`
2. **Select ALL content** (Ctrl+A or Cmd+A)
3. **Copy** (Ctrl+C or Cmd+C)
4. **Paste into PowerShell** on VPS (Right-click → Paste or Ctrl+V)
5. **Press Enter**
6. **Wait 20-25 minutes** for everything to install

---

## ✅ What Happens During Setup

The script will:

1. ✅ Install Chocolatey (Windows package manager)
2. ✅ Install Node.js LTS + npm
3. ✅ Install Python 3 + pip + trading packages
4. ✅ Install Deno runtime
5. ✅ Install PM2 process manager with Windows startup
6. ✅ Install Git
7. ✅ Enable WinRM (PowerShell Remoting)
8. ✅ Install OpenSSH Server
9. ✅ Install PowerShell modules
10. ✅ Install Visual C++ Build Tools
11. ✅ Create watchdog scripts
12. ✅ Start EC Markets MT5
13. ✅ Verify all installations

---

## 🔍 After Setup Completes

### Verify Installations:

```powershell
# Check Node.js
node --version

# Check Python
python --version

# Check Deno
deno --version

# Check PM2
pm2 --version

# Check Git
git --version

# Check WinRM
Get-Service WinRM

# Check SSH
Get-Service sshd
```

### Test Remote Access:

**SSH (from your Mac):**
```bash
ssh Administrator@45.32.89.134
```

**WinRM (from your Mac via PowerShell):**
```powershell
Enter-PSSession -ComputerName 45.32.89.134 -Credential Administrator
```

---

## 🎯 Next Steps After Setup

### 1. Verify Live Price System:
```powershell
# Check PM2 services
pm2 list

# Check Price Feeder logs
pm2 logs "Imperial Price Feeder" --lines 50
```

### 2. Verify Prices in Supabase:
- Go to Supabase Dashboard
- SQL Editor → Run:
```sql
SELECT symbol, mid, updated_at 
FROM market_prices 
ORDER BY updated_at DESC 
LIMIT 10;
```

### 3. Check Frontend Live Prices:
- Open: http://localhost:8080
- Navigate to Signals page
- Verify live prices are displaying

---

## 🛡️ After Setup: Services Will Auto-Start

Once setup completes:
- ✅ All runtime environments installed
- ✅ WinRM enabled (remote PowerShell access)
- ✅ SSH enabled (remote terminal access)
- ✅ PM2 configured for auto-start on boot
- ✅ Watchdogs monitoring services
- ✅ **Live price system will NEVER die!**

---

## 📝 Files Created

After running the script:
- `C:\imperial-watchdogs\price-feeder-watchdog.js` - Price Feeder watchdog
- `C:\imperial-watchdogs\mt5-watchdog.js` - MT5 watchdog

---

## ✅ Success Checklist

After completion, verify:
- [ ] Node.js installed and working
- [ ] Python installed with trading packages
- [ ] Deno installed
- [ ] PM2 installed and configured
- [ ] WinRM enabled (Get-Service WinRM shows "Running")
- [ ] SSH enabled (Get-Service sshd shows "Running")
- [ ] Can connect via SSH: `ssh Administrator@45.32.89.134`
- [ ] Can connect via WinRM: `Enter-PSSession -ComputerName 45.32.89.134`
- [ ] PM2 services running (pm2 list shows services)
- [ ] Live prices updating in Supabase database

---

## 🚨 Troubleshooting

### If Setup Fails:

1. **Read error messages** - they'll tell you what went wrong
2. **Check internet connection** - all installs require internet
3. **Ensure running as Administrator** - required for all installations
4. **Try individual steps** - installs are idempotent (can run multiple times)

### If WinRM/SSH Not Working:

```powershell
# Re-enable WinRM
Enable-PSRemoting -Force
winrm quickconfig -q

# Re-enable SSH
Set-Service -Name sshd -StartupType Automatic
Start-Service sshd
```

### If Services Not Starting:

```powershell
# Check PM2 status
pm2 list

# Check PM2 logs
pm2 logs --err --lines 100

# Restart all services
pm2 restart all
pm2 save
```

---

## 🎉 You're Done!

After completing all steps:
- ✅ All runtime environments installed
- ✅ Remote access configured (SSH + WinRM)
- ✅ Build tools installed
- ✅ Watchdogs monitoring services
- ✅ Services auto-start on boot
- ✅ **Ready for trading app development!**

---

**Ready? Open `COMPLETE_VPS_ENVIRONMENT_SETUP.ps1` and copy it to VPS PowerShell!** 🚀




