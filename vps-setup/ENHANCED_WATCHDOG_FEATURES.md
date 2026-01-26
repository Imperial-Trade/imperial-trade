# Enhanced Watchdog Features

## ✅ What the Enhanced Watchdog Does

### 1. **Monitors Price Feeder PM2 Process**
- Checks every 10 seconds if Price Feeder is online
- Restarts Price Feeder if PM2 process stops

### 2. **Monitors MT5 Process** (NEW!)
- Checks if EC Markets MT5 (`C:\MT5_PriceFeeder\terminal64.exe`) is running
- If MT5 is NOT running:
  - Automatically starts MT5
  - Waits 8 seconds for MT5 to initialize and auto-login
  - Restarts Price Feeder so it can reconnect

### 3. **Fast Recovery**
- Detection: 10 seconds
- MT5 startup: ~3-5 seconds
- Price Feeder restart: ~5 seconds
- **Total recovery time: ~15-20 seconds**

## 🔄 Recovery Flow

### Scenario: MT5 Terminal Closed

1. **Watchdog detects** (within 10 seconds):
   - MT5 process not found
   - Logs: `⚠️ [Watchdog] MT5 process not found - starting MT5...`

2. **Watchdog starts MT5**:
   - Executes: `Start-Process C:\MT5_PriceFeeder\terminal64.exe`
   - Logs: `🔄 [Watchdog] Starting MT5: C:\MT5_PriceFeeder\terminal64.exe`
   - Logs: `✅ [Watchdog] MT5 start command executed`

3. **MT5 auto-logs in** (if password saved):
   - MT5 opens and logs in automatically
   - Account: 81071266

4. **Watchdog restarts Price Feeder** (after 8 seconds):
   - Logs: `✅ [Watchdog] MT5 started, will restart Price Feeder in next check`
   - Logs: `✅ [Watchdog] Restarted Price Feeder after MT5 start`

5. **Price Feeder reconnects**:
   - Connects to MT5
   - Resumes price streaming

## ⚙️ Configuration

### Check Interval
- **10 seconds** - Fast detection

### Restart Threshold
- **1 failure** - Immediate restart

### MT5 Startup Wait
- **8 seconds** - Allows MT5 to initialize and auto-login

## 📋 Requirements

### For Auto-Login to Work:
1. Open EC Markets MT5: `C:\MT5_PriceFeeder\terminal64.exe`
2. Log in with account **81071266**
3. **Check "Save password" checkbox**
4. Close and reopen MT5 to verify auto-login works

## 🎯 Testing

### Test 1: Close MT5 Terminal
1. Close EC Markets MT5 window
2. Wait 10-15 seconds
3. Check watchdog logs: `pm2 logs price-feeder-watchdog --lines 30`
4. Verify MT5 was automatically started
5. Verify Price Feeder reconnected

### Test 2: Stop Price Feeder
1. Stop Price Feeder: `pm2 stop "Imperial Price Feeder"`
2. Wait 10-15 seconds
3. Check if watchdog restarted it: `pm2 status`
4. Verify Price Feeder is online again

## 📊 Monitoring

### Check Watchdog Status:
```powershell
pm2 status
pm2 logs price-feeder-watchdog --lines 30
```

### Check MT5 Status:
```powershell
Get-Process terminal64 | Where-Object { $_.Path -like '*MT5_PriceFeeder*' }
```

### Check Price Feeder Status:
```powershell
pm2 logs "Imperial Price Feeder" --lines 30
```

## ✅ Success Indicators

- Watchdog logs show: `✅ [Watchdog] Connected to PM2`
- Watchdog logs show: `🔍 [Watchdog] Starting Price Feeder monitoring...`
- If MT5 closes, logs show: `⚠️ [Watchdog] MT5 process not found - starting MT5...`
- After MT5 starts, logs show: `✅ [Watchdog] Restarted Price Feeder after MT5 start`
- Price Feeder logs show: `✅ MT5 connected - starting price publisher`
