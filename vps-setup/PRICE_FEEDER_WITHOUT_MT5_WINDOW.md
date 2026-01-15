# 🔒 Price Feeder Running Without MT5 Window

## ✅ Configuration

The Imperial Price Feeder is configured to work **even when the EC Markets MT5 window is closed**.

### How It Works

1. **MT5 Process Continues Running**
   - When you close the MT5 window, the `terminal64.exe` process continues running
   - The Python MT5 library can connect to MT5 even without a visible window
   - Price Feeder connects to the background MT5 process

2. **Background Monitoring**
   - Scheduled task monitors MT5 every 2 minutes
   - Automatically restarts MT5 if the process closes
   - Ensures MT5 is always available for Price Feeder

3. **Auto-Reconnect**
   - Price Feeder automatically reconnects when MT5 becomes available
   - PM2 auto-restart ensures Price Feeder stays running
   - No manual intervention needed

---

## 🛡️ Protection Layers

### Layer 1: MT5 Background Process
- MT5 runs even when window is closed
- Python MT5 library connects to background process
- No GUI required for API connections

### Layer 2: MT5 Monitoring Task
- **Task Name**: `KeepECMarketsMT5Running`
- **Frequency**: Every 2 minutes
- **Action**: Restart MT5 if process is not running
- **Status**: ✅ Configured

### Layer 3: Price Feeder Auto-Restart
- PM2 automatically restarts Price Feeder if it crashes
- Unlimited restart attempts
- Exponential backoff prevents loops

---

## 📋 Setup Instructions

### 1. Initial MT5 Login (One-Time)
1. Open EC Markets MT5 Terminal
2. Log in with:
   - **Login**: `81071266`
   - **Server**: `ECMarkets-MT5-Live01`
   - **Password**: (Your EC Markets password)
3. **You can now close the MT5 window** - it will keep running in background

### 2. Verify MT5 is Running
```powershell
Get-Process terminal64 | Where-Object { $_.Path -eq "C:\Program Files\MetaTrader 5\terminal64.exe" }
```

### 3. Verify Price Feeder Connection
```powershell
pm2 logs "Imperial Price Feeder" --lines 20
```

**Look for:**
- ✅ `MT5 connected`
- ✅ `Starting price publisher`
- ✅ `Streaming prices to Imperial Trade...`

---

## 🔧 Monitoring Commands

### Check MT5 Process
```powershell
Get-Process terminal64 | Select-Object Id,ProcessName,MainWindowTitle
```

### Check Monitoring Task
```powershell
Get-ScheduledTask -TaskName "KeepECMarketsMT5Running"
```

### Check Price Feeder Status
```powershell
pm2 status
pm2 logs "Imperial Price Feeder" --lines 10
```

---

## 🚨 Important Notes

1. **First Login Required**: You must log in to MT5 manually the first time
2. **Window Can Be Closed**: After logging in, you can close the MT5 window
3. **Process Stays Running**: The `terminal64.exe` process continues in background
4. **Auto-Restart**: If MT5 closes, the monitoring task will restart it
5. **Price Feeder Reconnects**: Price Feeder will automatically reconnect when MT5 is available

---

## ✅ Expected Behavior

### Normal Operation
- MT5 process running in background (no visible window)
- Price Feeder connected to MT5
- Prices streaming continuously
- No manual intervention needed

### After Closing MT5 Window
- MT5 process continues running
- Price Feeder maintains connection
- Prices continue streaming
- No interruption

### After MT5 Process Closes
- Monitoring task detects MT5 is not running
- Monitoring task restarts MT5 (within 2 minutes)
- Price Feeder reconnects automatically
- Prices resume streaming

---

## 📊 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    WINDOWS VPS                              │
│                                                              │
│  ┌────────────────────────┐  ┌──────────────────────────┐ │
│  │  EC Markets MT5        │  │  Imperial Price Feeder  │ │
│  │  (Background Process)  │  │  (PM2 Process)          │ │
│  │                        │  │                          │ │
│  │  Process: terminal64   │  │  Python: mt5_bridge.py  │ │
│  │  Window: Closed ✅     │  │  Status: Connected ✅    │ │
│  │  Login: 81071266      │  │  Prices: Streaming ✅    │ │
│  └────────────────────────┘  └──────────────────────────┘ │
│           ▲                          │                     │
│           │                          │                     │
│           └───────────┬──────────────┘                     │
│                       │                                     │
│              Python MT5 Library                             │
│              (Connects to background MT5)                   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Monitoring Task (Every 2 minutes)                  │  │
│  │  - Checks if MT5 is running                         │  │
│  │  - Restarts MT5 if not running                       │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ Verification Checklist

- [ ] MT5 logged in manually (one-time)
- [ ] MT5 window can be closed
- [ ] MT5 process still running (`Get-Process terminal64`)
- [ ] Price Feeder connected (`pm2 logs` shows "MT5 connected")
- [ ] Monitoring task created (`Get-ScheduledTask`)
- [ ] Prices streaming (check logs for price updates)

---

**Last Updated**: 2026-01-09 02:57 UTC
**Status**: ✅ **CONFIGURED FOR BACKGROUND OPERATION**
