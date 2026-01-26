# ❌ MT5 Connection Issue Found

## Problem

Python MetaTrader5 library **CANNOT initialize MT5 Terminal**. This is why your broker connection is failing.

## Root Cause

The MT5 Terminal is running but in a state where the Python API cannot access it. This happens when:
- MT5 was started before the Python service
- MT5 is minimized to system tray
- MT5 needs to be restarted to allow API access

## ✅ Solution (Manual Steps Required)

### On Your VPS:

1. **Close MT5 Terminal Completely**
   - Right-click MT5 in taskbar → Close
   - Or run: `taskkill /IM terminal64.exe /F`

2. **Start MT5 Terminal Fresh**
   - Open: `C:\Program Files\MetaTrader 5\terminal64.exe`
   - **IMPORTANT:** Log in to your EC Markets demo account
   - Account: `800107112`
   - Server: `ECMarkets-MT5-Demo`

3. **Keep MT5 Open and Logged In**
   - Don't minimize to system tray
   - Keep the terminal window visible

4. **Enable API Access in MT5**
   - Go to: **Tools → Options → Expert Advisors**
   - ✅ Check "Allow automated trading"
   - ✅ Check "Allow DLL imports"
   - Click **OK**

5. **Restart the Broker Service**
   ```powershell
   pm2 restart imperial-trade-broker-service
   ```

6. **Test the Connection Again**
   - Go back to your app
   - Click "Connect Broker"
   - It should work now!

## Why This Happens

MetaTrader5 Python library requires:
- MT5 Terminal to be **actively running** (not just a background process)
- Terminal to be **logged in** to an account
- Terminal to be in a **fresh state** (recently started)
- **API access enabled** in Expert Advisors settings

The 60-second timeout you're seeing means Python is waiting for MT5 to respond, but MT5 is not in a state where it can respond to API calls.

## Quick Fix Commands (Run on VPS)

```powershell
# 1. Close MT5
taskkill /IM terminal64.exe /F

# 2. Wait 3 seconds
timeout /t 3 /nobreak

# 3. Start MT5
Start-Process "C:\Program Files\MetaTrader 5\terminal64.exe"

# 4. MANUALLY log in to MT5 (you must do this step!)

# 5. Restart service
pm2 restart imperial-trade-broker-service

# 6. Test connection from your app
```

## Verification

After restarting MT5 and logging in, run this test on VPS:

```powershell
cd C:\vps-broker-service
powershell -ExecutionPolicy Bypass -File .\test-mt5-connection.ps1
```

Should show: "✅ Python can connect to MT5!"

---

**The connection will work once MT5 is restarted and you're logged in!** 🚀






