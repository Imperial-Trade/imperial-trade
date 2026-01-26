# 🔓 Unlock VPS and Start MT5 - Step-by-Step Guide

## Current Status
You're viewing the VPS lock screen via Vultr web console. Follow these steps to unlock and start MT5.

---

## Step 1: Unlock the VPS

1. **Press `Ctrl+Alt+Delete`** in the Vultr web console
   - You can use the virtual keyboard or the button in the web console interface
   - This will unlock the Windows session

2. **Enter your password** (if prompted)
   - Password: `2#bWj}tv=}5d}u5}`

---

## Step 2: Start MT5 Terminal

Once unlocked, you have two options:

### Option A: Start MT5 via PowerShell (Recommended)

1. **Open PowerShell** (as Administrator)
   - Press `Win + X` and select "Windows PowerShell (Admin)"
   - Or search for "PowerShell" and right-click → "Run as Administrator"

2. **Run this command**:
   ```powershell
   Start-Process "C:\Program Files\MetaTrader 5\terminal64.exe" -ArgumentList "/portable"
   ```

3. **Wait for MT5 to open** (may take 10-30 seconds)

### Option B: Start MT5 Manually

1. **Open File Explorer**
2. **Navigate to**: `C:\Program Files\MetaTrader 5\`
3. **Double-click**: `terminal64.exe`
4. **If prompted**, select "Run in portable mode" or add `/portable` flag

---

## Step 3: Log In to MT5 (First Time Only)

1. **In the MT5 terminal**, click "File" → "Login to Trade Account"
2. **Enter credentials**:
   - **Login**: `800107112`
   - **Password**: `Demo@123`
   - **Server**: `ECMarketsLtd-Demo`
3. **Click "Login"**
4. **Wait for connection** (may take 10-20 seconds)

---

## Step 4: Enable Algorithmic Trading

1. **In MT5**, go to: **Tools** → **Options** → **Expert Advisors**
2. **Check the box**: ✅ **"Allow Algorithmic Trading"**
3. **Click "OK"**

**OR** run this PowerShell command (as Administrator):
```powershell
cd C:\vps-broker-service
.\vps-setup\ENABLE_ALGORITHMIC_TRADING_REGISTRY.ps1
```

---

## Step 5: Keep MT5 Running

**IMPORTANT**: Do NOT close the MT5 terminal window. It must remain running for the connection tests to work.

- You can minimize it, but don't close it
- The MT5 process must stay active

---

## Step 6: Verify MT5 is Running

Run this in PowerShell to verify:
```powershell
Get-Process terminal64 -ErrorAction SilentlyContinue | Select-Object ProcessName, Id, StartTime
```

You should see the `terminal64` process listed.

---

## Step 7: Test Connection from Frontend

Once MT5 is running and logged in:

1. **Go back to your frontend** (localhost:8081)
2. **Click "Connect Broker"** button
3. **Monitor the connection test**
4. **Check VPS logs** for success:
   ```powershell
   pm2 logs imperial-trade-broker-service --lines 50
   ```

---

## Expected Result

Once MT5 is running, you should see in the VPS logs:
```
✅ Credentials decrypted successfully
🔌 Testing MT5 connection...
[MT5 Client] Attempt 1/3: Trying server "ECMarketsLtd-Demo"
✅ MT5 connection successful
✅ Acquired terminal X for user ...
✅ Released terminal X
```

And in the frontend:
- ✅ Connection status: "Connected"
- ✅ Account info displayed (login, server, balance)
- ✅ Success toast notification

---

## Troubleshooting

### If MT5 won't start:
- Check if another MT5 instance is already running
- Try restarting the VPS
- Check Windows Event Viewer for errors

### If connection still fails:
- Verify MT5 is logged in (check bottom-right of MT5 window)
- Verify "Allow Algorithmic Trading" is enabled
- Check VPS logs for specific error messages

---

**Ready to proceed?** Unlock the VPS and follow the steps above! 🚀
