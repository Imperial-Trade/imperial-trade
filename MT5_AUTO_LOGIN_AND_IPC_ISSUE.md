# MT5 Auto-Login Setup - Complete

## ✅ Auto-Login Configuration:

### 1. launch.ini Created:
**Location**: `/root/imperial-factory/mt5-master/config/launch.ini`
```
[Common]
Login=81071266
Password=Imperial@2026
Server=ECMarkets-MT5-Live01
```

### 2. Launch Command:
```bash
wine64 'C:\\imperial-factory\\mt5-master\\terminal64.exe' /portable /config:config/launch.ini
```

### 3. Startup Script:
- Location: `/root/start-mt5.sh`
- Launches MT5 with auto-login
- Waits 25 seconds for initialization

## ✅ Your MacBook is NOT Needed:

The VPS handles everything:
1. MT5 launches automatically
2. MT5 reads launch.ini
3. MT5 auto-logs in using credentials
4. Python connects to logged-in MT5
5. **Fully automated - no manual intervention!**

## ❌ Current Issue:

Even with auto-login configured, Python library **cannot connect** due to:
- **IPC timeout (-10005)**
- **Wine/MT5 IPC incompatibility**

This is a **fundamental limitation** - not a login issue.

## The Real Problem:

The Python MetaTrader5 library uses Windows named pipes for IPC. Wine's pipe implementation is not compatible with MT5's IPC requirements, even when:
- ✅ MT5 is running
- ✅ MT5 is logged in
- ✅ All paths are correct
- ✅ All timeouts are increased

## Solution Options:

1. **Native Windows VPS** (Recommended)
   - Use Windows VPS instead of Ubuntu/Wine
   - Python library will connect reliably
   - Auto-login will work perfectly

2. **MQL5 EA for Real-Time Sync** (Already Working)
   - Your MQL5 EA pushes trades to Supabase
   - This works regardless of Python connection
   - Use this for real-time sync

3. **Docker Windows Container**
   - Run MT5 in Windows Docker container
   - Python library can connect

## Current Status:
- ✅ Auto-login configured (launch.ini)
- ✅ MT5 launches correctly
- ✅ Startup script ready
- ❌ Python cannot connect (IPC timeout)
- ⚠️  **Wine/MT5 IPC incompatibility confirmed**

**The credentials ARE configured correctly. The issue is Wine cannot provide the IPC connection that Python needs.**
