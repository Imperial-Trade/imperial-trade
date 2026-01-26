# 🔒 Price Feeder - Always Running (Even Without MT5 Window)

## ✅ Configuration Complete

The Imperial Price Feeder is configured to run **even when the EC Markets MT5 window is closed**.

---

## 🎯 How It Works

### 1. **MT5 Background Process**
- When you close the MT5 window, the `terminal64.exe` process **continues running**
- The Python MT5 library can connect to MT5 **even without a visible window**
- Price Feeder connects to the background MT5 process via Python API

### 2. **Current Status**
- ✅ **MT5 Process**: Running (2 instances detected)
- ✅ **Price Feeder**: ONLINE (PM2 auto-restart enabled)
- ✅ **Connection**: Python MT5 library connects to background process
- ✅ **Window**: Can be closed - process continues

---

## 📋 Setup Instructions

### Step 1: Initial MT5 Login (One-Time)
1. Open EC Markets MT5 Terminal on VPS
2. Log in with:
   - **Login**: `81071266`
   - **Server**: `ECMarkets-MT5-Live01`
   - **Password**: (Your EC Markets password)
3. **After logging in, you can close the MT5 window** ✅

### Step 2: Verify MT5 Process
```powershell
Get-Process terminal64 | Where-Object { $_.Path -eq "C:\Program Files\MetaTrader 5\terminal64.exe" }
```

**Expected**: Process is running (even if window is closed)

### Step 3: Verify Price Feeder
```powershell
pm2 status
pm2 logs "Imperial Price Feeder" --lines 20
```

**Look for:**
- ✅ `MT5 connected`
- ✅ `Starting price publisher`
- ✅ `Streaming prices to Imperial Trade...`

---

## 🛡️ Protection Mechanisms

### 1. **PM2 Auto-Restart** ✅
- Price Feeder automatically restarts if it crashes
- Unlimited restart attempts
- Exponential backoff prevents loops

### 2. **MT5 Background Process** ✅
- MT5 process continues running when window is closed
- Python MT5 library connects to background process
- No GUI required for API connections

### 3. **Auto-Reconnect** ✅
- Price Feeder automatically reconnects when MT5 is available
- PM2 ensures Price Feeder stays running
- No manual intervention needed

---

## ✅ Key Points

1. **Window Can Be Closed**: After logging in, you can close the MT5 window
2. **Process Continues**: The `terminal64.exe` process keeps running
3. **Price Feeder Connects**: Python MT5 library connects to background process
4. **Prices Stream**: Prices continue streaming even without visible window
5. **Auto-Restart**: PM2 ensures Price Feeder always runs

---

## 🔍 Verification

### Check MT5 Process (Even if Window Closed)
```powershell
Get-Process terminal64 | Select-Object Id,ProcessName,MainWindowTitle
```

**Expected Result:**
- Process ID: (number)
- ProcessName: terminal64
- MainWindowTitle: (empty if window is closed, but process is running)

### Check Price Feeder Status
```powershell
pm2 status
pm2 logs "Imperial Price Feeder" --lines 10
```

**Expected Result:**
- Status: online
- Logs show: "MT5 connected" or "Streaming prices"

---

## 🚨 Important Notes

1. **First Login Required**: You must log in to MT5 manually the first time
2. **Window Can Be Closed**: After login, close the window - process continues
3. **Process Must Stay Running**: If MT5 process closes, Price Feeder will fail
4. **Auto-Restart**: PM2 will keep restarting Price Feeder until MT5 is available
5. **Background Operation**: No GUI needed - everything runs in background

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
│  │  Process: terminal64  │  │  Python: mt5_bridge.py  │ │
│  │  Window: ❌ CLOSED     │  │  Status: ✅ CONNECTED    │ │
│  │  Process: ✅ RUNNING   │  │  Prices: ✅ STREAMING    │ │
│  │  Login: 81071266      │  │                          │ │
│  └────────────────────────┘  └──────────────────────────┘ │
│           ▲                          │                     │
│           │                          │                     │
│           └───────────┬──────────────┘                     │
│                       │                                     │
│              Python MT5 Library                             │
│              (Connects to background MT5)                   │
│              ✅ Works without visible window                 │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ Current Status

**MT5 Process**: ✅ Running (background)
**Price Feeder**: ✅ ONLINE (auto-restart enabled)
**Window Status**: Can be closed ✅
**Connection**: Python MT5 library connects to background process ✅

---

**Last Updated**: 2026-01-09 02:58 UTC
**Status**: ✅ **CONFIGURED FOR BACKGROUND OPERATION**
