# MT5 Manual Setup Required

## Issue
Generic MT5 terminal needs to be manually logged in **at least once** before Python MT5 library can connect via IPC.

## Root Cause
MetaTrader 5 requires the terminal to be "activated" with a manual login before allowing programmatic connections via the Python library. This is a security feature of MT5.

## Solution: Manual Login Required

### Step 1: Access VPS Remote Desktop
1. Go to Vultr dashboard
2. Click on your VPS instance
3. Click "View Console" or use Remote Desktop
4. Log in to Windows VPS

### Step 2: Open Generic MT5
1. Navigate to: `C:\Program Files\MetaTrader 5\terminal64.exe`
2. Double-click to open (or use Start Menu if installed)
3. Wait for MT5 to fully load

### Step 3: Log In Manually
1. In MT5, go to: **File → Login to Trade Account**
2. Enter any demo account credentials (or the test account):
   - **Login**: `800107112`
   - **Password**: `Demo@123`
   - **Server**: `ECMarkets-MT5-Demo`
3. Click **Login**
4. Wait for connection to establish (green bars in bottom right)

### Step 4: Keep Terminal Open
- **DO NOT close** the MT5 terminal
- Minimize it if needed, but keep it running
- The terminal must remain open for Python connections to work

### Step 5: Verify Connection
After manual login, Python connections should work:
```bash
# Test from VPS
python C:\vps-broker-service\python\test_connection.py '{"login":"800107112","password":"Demo@123","server":"ECMarkets-MT5-Demo"}'
```

## Alternative: Auto-Login Script

If you want to automate this, we can create a PowerShell script that:
1. Starts Generic MT5
2. Waits for it to load
3. Automatically logs in using saved credentials
4. Keeps terminal open

Would you like me to create this auto-login script?

## Current Status
- ✅ Generic MT5 can be started remotely
- ✅ Retry logic is working (3 attempts)
- ❌ IPC connection fails because terminal not manually logged in
- ⚠️ **Manual login required** before Python connections will work

## Next Steps
1. **Immediate**: Manually log in to Generic MT5 via Remote Desktop
2. **Short-term**: Create auto-login script for automation
3. **Long-term**: Consider MT5 auto-login configuration









