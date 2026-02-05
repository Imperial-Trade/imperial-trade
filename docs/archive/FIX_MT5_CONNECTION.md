# 🔧 MT5 Connection Issue - Python Timeout

## Problem Identified

The Python script is timing out (60 seconds) when trying to connect to MT5. This means:
- ✅ VPS service is running
- ✅ MT5 Terminal is running (2 processes detected)
- ❌ Python MetaTrader5 library cannot connect to MT5 terminal

## Root Cause

The MT5 terminal is running in **Session 1 (Console)** but the Python script needs to access it. This is a common Windows service/session isolation issue.

## Solutions

### Solution 1: Restart MT5 Terminal (Quick Fix)

1. **On VPS, close MT5 Terminal completely**
2. **Open MT5 Terminal again** (as the same user running the service)
3. **Log in to your MT5 account manually**
4. **Keep MT5 Terminal open and logged in**
5. **Test the connection again**

### Solution 2: Check MT5 Terminal State

The MT5 terminal must be:
- ✅ Open and running
- ✅ Logged in to an account
- ✅ Not minimized to system tray
- ✅ Running in the same user session as the Python script

### Solution 3: Verify MT5 Path

Check if Generic MT5 is at the correct path:
```powershell
Test-Path "C:\Program Files\MetaTrader 5\terminal64.exe"
```

If it's elsewhere, update the path in `python/test_connection.py`.

### Solution 4: Check MT5 API Settings

In MT5 Terminal:
1. Go to **Tools → Options → Expert Advisors**
2. ✅ Enable "Allow automated trading"
3. ✅ Enable "Allow DLL imports"
4. Click **OK**

## Testing the Fix

After applying fixes, test directly:

```bash
# On VPS
cd C:\vps-broker-service
python python\test_connection.py "{\"login\":\"YOUR_LOGIN\",\"password\":\"YOUR_PASSWORD\",\"server\":\"ECMarkets-MT5-Demo\"}"
```

Should return JSON with `"connected": true` within 5-10 seconds.

## Why This Happens

MetaTrader5 Python library requires:
1. MT5 Terminal to be running
2. Terminal to be in an accessible state (not just a background process)
3. Terminal to be initialized (logged in at least once)
4. Same user session access

The 60-second timeout indicates the Python library is waiting for MT5 to respond but never gets a response.

## Quick Fix Command

Run this on VPS to restart MT5 and the service:

```powershell
# Close MT5
taskkill /IM terminal64.exe /F

# Wait 2 seconds
Start-Sleep -Seconds 2

# Start MT5 (adjust path if needed)
Start-Process "C:\Program Files\MetaTrader 5\terminal64.exe"

# Wait for MT5 to start
Start-Sleep -Seconds 5

# Restart PM2 service
pm2 restart imperial-trade-broker-service
```

Then manually log in to MT5 Terminal and test the connection again.






