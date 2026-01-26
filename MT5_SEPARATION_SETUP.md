# MT5 Separation Setup - EC Markets vs Regular MT5

## 🎯 Goal

Ensure **NO INTERFERENCE** between:
- **EC Markets MT5**: For LIVE PRICE FEED (must stay running 24/7)
- **Regular MT5 / Python MT5 Library**: For AUTO-SYNC JOURNAL (connects to user brokers)

---

## ✅ How They Work Together

### **EC Markets MT5 (Live Price Feed)**
- **Path**: `C:\Program Files\EC Markets MetaTrader 5\terminal64.exe`
- **Purpose**: Provides live price data to `price-ingestor`
- **Service**: "Imperial Price Feeder" (PM2)
- **Status**: Must be running 24/7
- **Connection**: Logged into EC Markets broker account

### **Python MT5 Library (Auto-Sync Journal)**
- **Library**: `MetaTrader5` Python package
- **Purpose**: Fetches trades from user's brokers (XS.com, PU Prime, etc.)
- **Service**: "Imperial Broker Service" (PM2)
- **How it works**:
  - Uses `mt5.initialize()` to connect to MT5 terminal
  - Uses `mt5.login(login, password, server)` to login to user's broker
  - **IMPORTANT**: Can login to different brokers without affecting EC Markets connection
  - After fetching trades, logs out automatically

---

## 🔍 Verification Script

Run this on your VPS to verify separation:

```powershell
# Save as: verify-mt5-separation.ps1
# Run: .\verify-mt5-separation.ps1

Write-Host "=== MT5 Separation Verification ===" -ForegroundColor Cyan

# Check EC Markets MT5
$ecMarketsPath = "C:\Program Files\EC Markets MetaTrader 5\terminal64.exe"
$ecMarketsProcess = Get-Process -Name "terminal64" -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*EC Markets*" }

if ($ecMarketsProcess) {
    Write-Host "✅ EC Markets MT5: RUNNING" -ForegroundColor Green
    Write-Host "   PID: $($ecMarketsProcess.Id)" -ForegroundColor Gray
} else {
    Write-Host "❌ EC Markets MT5: NOT RUNNING" -ForegroundColor Red
}

# Check Python MT5 Library
$pythonMT5 = python -c "import MetaTrader5; print('OK')" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Python MetaTrader5: INSTALLED" -ForegroundColor Green
} else {
    Write-Host "❌ Python MetaTrader5: NOT INSTALLED" -ForegroundColor Red
    Write-Host "   Install: pip install MetaTrader5" -ForegroundColor Yellow
}

# Check Services
Write-Host "`n=== Services Status ===" -ForegroundColor Cyan
pm2 list | Select-String -Pattern "Imperial"
```

---

## 🛡️ How Python MT5 Library Avoids Interference

### **Key Points:**

1. **Separate Login Sessions**:
   - `mt5.login()` creates a NEW login session
   - Does NOT disconnect existing EC Markets session
   - MT5 terminal can handle multiple broker connections

2. **Temporary Connections**:
   - Auto-sync logs in → Fetches trades → Logs out
   - EC Markets stays logged in throughout

3. **No Terminal Restart**:
   - Python library uses existing MT5 terminal process
   - Does NOT close or restart the terminal
   - EC Markets MT5 continues running normally

---

## 📝 Current Implementation

### **Auto-Sync Service** (`vps-broker-service/src/mt5-client.ts`):

```typescript
// Uses Python script to login to user's broker
export async function fetchMT5Trades(credentials: MT5Credentials) {
  // Spawns Python process
  // Python script calls: mt5.login(login, password, server)
  // Fetches trades
  // Returns data
  // Python script calls: mt5.shutdown() (only closes Python connection, not terminal)
}
```

### **Python Script** (`vps-broker-service/python/fetch_trades.py`):

```python
# Initialize MT5 (connects to existing terminal)
mt5.initialize()

# Login to USER'S broker (not EC Markets)
mt5.login(login, password, server)

# Fetch trades
trades = mt5.history_deals_get(...)

# Shutdown (only closes Python connection)
mt5.shutdown()
```

**Important**: `mt5.shutdown()` only closes the Python library's connection, NOT the MT5 terminal itself!

---

## ✅ Verification Checklist

- [ ] EC Markets MT5 terminal is running
- [ ] "Imperial Price Feeder" service is running (PM2)
- [ ] Python MetaTrader5 library is installed
- [ ] "Imperial Broker Service" is running (PM2)
- [ ] Auto-sync can fetch trades from user brokers
- [ ] Live price feed continues working during auto-sync

---

## 🚨 Troubleshooting

### **Issue: Auto-sync fails to connect**

**Check**:
1. Is EC Markets MT5 terminal running? (Required for Python library)
2. Are user broker credentials correct?
3. Is Python MetaTrader5 library installed? (`pip install MetaTrader5`)

### **Issue: Live price feed stops during auto-sync**

**This should NOT happen!** If it does:
1. Check PM2 logs: `pm2 logs "Imperial Price Feeder"`
2. Verify EC Markets MT5 is still running: `Get-Process -Name terminal64`
3. Restart price feeder: `pm2 restart "Imperial Price Feeder"`

### **Issue: Both services conflict**

**Solution**: They shouldn't conflict. If they do:
1. Ensure EC Markets MT5 is in separate directory
2. Verify Python library uses existing terminal (not creating new one)
3. Check firewall/port conflicts

---

## 📊 Expected Behavior

### **Normal Operation**:

```
Time    | EC Markets MT5 | Auto-Sync | Status
--------|----------------|-----------|--------
00:00   | ✅ Running     | Idle      | ✅ OK
00:30   | ✅ Running     | Syncing   | ✅ OK (no interference)
01:00   | ✅ Running     | Idle      | ✅ OK
```

### **During Auto-Sync**:

1. Auto-sync starts
2. Python script calls `mt5.login(user_broker)`
3. EC Markets MT5 continues running (separate session)
4. Python fetches trades
5. Python calls `mt5.shutdown()` (closes Python connection only)
6. EC Markets MT5 still running
7. Live price feed continues normally

---

## ✅ Summary

**NO INTERFERENCE** because:
- ✅ EC Markets MT5 runs in separate process
- ✅ Python MT5 library uses existing terminal (doesn't restart it)
- ✅ `mt5.login()` creates new session (doesn't disconnect existing)
- ✅ `mt5.shutdown()` only closes Python connection (not terminal)

**Both can run simultaneously without issues!**


