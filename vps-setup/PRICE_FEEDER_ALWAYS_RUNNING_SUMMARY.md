# 🔒 Imperial Price Feeder - Always Running Configuration

## ✅ Configuration Complete

### **PM2 Auto-Restart** ✅
- **Max Restarts**: Unlimited (999,999)
- **Min Uptime**: 1000ms (1 second)
- **Exponential Backoff**: 100ms
- **Status**: ✅ Configured

### **PM2 Persistence** ✅
- **PM2 Save**: Enabled
- **Auto-dump**: Enabled
- **Save File**: `C:\Users\Administrator\.pm2\dump.pm2`
- **Status**: ✅ Configured

### **Windows Startup Task** ✅
- **Task Name**: `ImperialPriceFeederAutoStart`
- **Trigger**: At Windows startup
- **Action**: Start PM2 Price Feeder
- **Run Level**: Highest (Administrator)
- **Restart on Failure**: Yes (3 attempts, 1 minute interval)
- **Status**: ✅ Created

---

## 🛡️ Protection Layers

### Layer 1: PM2 Auto-Restart
- Automatically restarts if process crashes
- Unlimited restart attempts
- Exponential backoff prevents restart loops

### Layer 2: PM2 Persistence
- Saves process list on every change
- Restores processes after PM2 restart
- Persists configuration across sessions

### Layer 3: Windows Startup Task
- Starts Price Feeder automatically on Windows boot
- Runs with highest privileges
- Restarts on failure (3 attempts)

---

## 📋 Verification Commands

### Check PM2 Status
```powershell
pm2 status
```

### Check PM2 Configuration
```powershell
pm2 describe "Imperial Price Feeder"
```

### Check Windows Startup Task
```powershell
Get-ScheduledTask -TaskName "ImperialPriceFeederAutoStart"
```

### Check PM2 Save File
```powershell
Test-Path "$env:USERPROFILE\.pm2\dump.pm2"
```

---

## 🔧 Manual Commands (If Needed)

### Restart Price Feeder
```powershell
pm2 restart "Imperial Price Feeder"
pm2 save
```

### Start Price Feeder (if stopped)
```powershell
pm2 start C:\imperial-price-feeder\dist\index.js --name "Imperial Price Feeder"
pm2 save
```

### View Logs
```powershell
pm2 logs "Imperial Price Feeder" --lines 50
```

---

## 🚨 Important Notes

1. **MT5 Must Stay Open**: Price Feeder requires EC Markets MT5 to be open and logged in
2. **No Manual Intervention**: All restarts are automatic
3. **Survives Reboots**: Windows startup task ensures Price Feeder starts on boot
4. **PM2 Persistence**: Configuration survives PM2 restarts
5. **Unlimited Restarts**: PM2 will keep trying to restart if it fails

---

## ✅ Current Status

**PM2 Status**: ✅ ONLINE
- Process ID: 0
- Status: Online
- Restarts: 60 (auto-restarting due to MT5 connection issue)
- Uptime: 5s

**Configuration**: ✅ COMPLETE
- PM2 Auto-restart: Enabled
- PM2 Save: Enabled
- Windows Startup Task: Created
- Health Check: Ready

**Action Required**: 
- Log in to EC Markets MT5 manually (Login: 81071266, Server: ECMarkets-MT5-Live01)
- Once logged in, Price Feeder will connect and stop restarting

---

**Last Updated**: 2026-01-09 02:56 UTC
**Status**: ✅ **CONFIGURED FOR ALWAYS RUNNING**
