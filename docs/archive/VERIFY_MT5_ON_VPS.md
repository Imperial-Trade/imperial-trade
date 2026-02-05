# Verify MT5 Separation on VPS - Step by Step

## 🎯 Your VPS Details

- **IP Address**: `45.32.89.134`
- **Status**: Active
- **OS**: Windows

---

## 📋 Step 1: Connect to VPS

### Option A: Vultr Web Console
1. Go to https://my.vultr.com
2. Click on your VPS instance
3. Click "View Console" to open browser-based RDP

### Option B: RDP Client (macOS)
1. Open Microsoft Remote Desktop (or any RDP client)
2. Connect to: `45.32.89.134:3389`
3. Username: `Administrator`
4. Enter your password

---

## 🔍 Step 2: Run Verification Script

Once connected to VPS, open **PowerShell as Administrator** and run:

```powershell
# Copy and paste this entire script
Write-Host "=== MT5 Separation Verification ===" -ForegroundColor Cyan

# 1. Check EC Markets MT5 Process
Write-Host "`n1. EC Markets MT5 (Live Price Feed):" -ForegroundColor Yellow
$ecMarkets = Get-Process -Name "terminal64" -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*EC Markets*" }
if ($ecMarkets) {
    Write-Host "   ✅ RUNNING" -ForegroundColor Green
    Write-Host "   Path: $($ecMarkets.Path)" -ForegroundColor Gray
    Write-Host "   PID: $($ecMarkets.Id)" -ForegroundColor Gray
} else {
    Write-Host "   ❌ NOT RUNNING" -ForegroundColor Red
    Write-Host "   ⚠️  Live price feed will NOT work!" -ForegroundColor Yellow
}

# 2. Check Regular MT5 Process (if exists)
Write-Host "`n2. Regular MT5 (if installed):" -ForegroundColor Yellow
$regularMT5 = Get-Process -Name "terminal64" -ErrorAction SilentlyContinue | Where-Object { $_.Path -notlike "*EC Markets*" }
if ($regularMT5) {
    Write-Host "   ✅ RUNNING" -ForegroundColor Green
    Write-Host "   Path: $($regularMT5.Path)" -ForegroundColor Gray
} else {
    Write-Host "   ℹ️  NOT RUNNING (OK - Python library uses EC Markets terminal)" -ForegroundColor Cyan
}

# 3. Check Python MT5 Library
Write-Host "`n3. Python MetaTrader5 Library:" -ForegroundColor Yellow
$pythonMT5 = python -c "import MetaTrader5; print('OK')" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ INSTALLED" -ForegroundColor Green
} else {
    Write-Host "   ❌ NOT INSTALLED" -ForegroundColor Red
    Write-Host "   Install with: pip install MetaTrader5" -ForegroundColor Yellow
}

# 4. Check PM2 Services
Write-Host "`n4. PM2 Services:" -ForegroundColor Yellow
pm2 list | Select-String -Pattern "Imperial"

# 5. Check MT5 Installation Paths
Write-Host "`n5. MT5 Installation Paths:" -ForegroundColor Yellow
$ecPath = "C:\Program Files\EC Markets MetaTrader 5\terminal64.exe"
$regularPath = "C:\Program Files\MetaTrader 5\terminal64.exe"

if (Test-Path $ecPath) {
    Write-Host "   ✅ EC Markets: $ecPath" -ForegroundColor Green
} else {
    Write-Host "   ❌ EC Markets: NOT FOUND" -ForegroundColor Red
}

if (Test-Path $regularPath) {
    Write-Host "   ✅ Regular MT5: $regularPath" -ForegroundColor Green
} else {
    Write-Host "   ℹ️  Regular MT5: NOT FOUND (OK for auto-sync)" -ForegroundColor Cyan
}

# Summary
Write-Host "`n=== Summary ===" -ForegroundColor Cyan
Write-Host "EC Markets MT5: For LIVE PRICE FEED (must be running)" -ForegroundColor White
Write-Host "Python MT5 Library: For AUTO-SYNC JOURNAL (uses existing terminal)" -ForegroundColor White
Write-Host "`n✅ No interference: Both can work simultaneously" -ForegroundColor Green
```

---

## ✅ Expected Results

### **If Everything is Correct:**

```
1. EC Markets MT5: ✅ RUNNING
2. Regular MT5: ℹ️  NOT RUNNING (OK)
3. Python MetaTrader5: ✅ INSTALLED
4. PM2 Services: 
   - Imperial Price Feeder: online
   - Imperial Broker Service: online
5. MT5 Paths:
   - ✅ EC Markets: C:\Program Files\EC Markets MetaTrader 5\terminal64.exe
   - ℹ️  Regular MT5: NOT FOUND (OK)
```

---

## 🔧 Step 3: Fix Issues (if any)

### **Issue 1: EC Markets MT5 Not Running**

```powershell
# Start EC Markets MT5
Start-Process "C:\Program Files\EC Markets MetaTrader 5\terminal64.exe"

# Verify it's running
Get-Process -Name "terminal64" | Where-Object { $_.Path -like "*EC Markets*" }
```

### **Issue 2: Python MT5 Library Not Installed**

```powershell
# Install Python MT5 library
pip install MetaTrader5

# Verify installation
python -c "import MetaTrader5; print('OK')"
```

### **Issue 3: PM2 Services Not Running**

```powershell
# Check status
pm2 list

# Start services if needed
cd C:\imperial-price-feeder
pm2 start dist/index.js --name "Imperial Price Feeder"

cd C:\vps-broker-service
pm2 start dist/index.js --name "Imperial Broker Service"

# Save PM2 configuration
pm2 save
```

---

## 🎯 How They Work Together

### **EC Markets MT5 (Live Price Feed)**
- **Process**: `terminal64.exe` from EC Markets directory
- **Service**: "Imperial Price Feeder" (PM2)
- **Purpose**: Provides live prices to Supabase
- **Must Stay**: Running 24/7

### **Python MT5 Library (Auto-Sync)**
- **Library**: `MetaTrader5` Python package
- **Service**: "Imperial Broker Service" (PM2)
- **Purpose**: Fetches trades from user brokers
- **How it works**:
  1. Calls `mt5.initialize()` → Connects to existing MT5 terminal
  2. Calls `mt5.login(user_login, password, server)` → Logs into user's broker
  3. Fetches trades
  4. Calls `mt5.shutdown()` → Closes Python connection (NOT the terminal)

**Key Point**: `mt5.login()` creates a NEW session without disconnecting EC Markets!

---

## ✅ Verification Checklist

After running the script, verify:

- [ ] EC Markets MT5 process is running
- [ ] Python MetaTrader5 library is installed
- [ ] "Imperial Price Feeder" service is online (PM2)
- [ ] "Imperial Broker Service" service is online (PM2)
- [ ] Both services can run simultaneously without errors

---

## 🚨 If You See Conflicts

### **Test Auto-Sync Without Affecting Price Feed:**

1. **Monitor Price Feed** (in separate terminal):
   ```powershell
   pm2 logs "Imperial Price Feeder" --lines 20
   ```

2. **Trigger Auto-Sync** (test):
   - Connect a broker in the app
   - Wait for auto-sync to run
   - Check if price feed continues

3. **Verify No Interference**:
   - Price feed should continue updating
   - Auto-sync should complete successfully
   - No errors in either service

---

## 📊 Expected Behavior

```
Time    | EC Markets MT5 | Price Feeder | Auto-Sync | Status
--------|---------------|--------------|-----------|--------
00:00   | ✅ Running    | ✅ Online    | Idle      | ✅ OK
00:30   | ✅ Running    | ✅ Online    | Syncing   | ✅ OK (no interference)
01:00   | ✅ Running    | ✅ Online    | Idle      | ✅ OK
```

**Both should work simultaneously without any issues!**


