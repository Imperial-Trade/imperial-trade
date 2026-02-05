# MT5 IPC Timeout - Final Setup Instructions

## ✅ All Automated Fixes Applied

1. ✅ **Retry Logic**: 3 attempts with exponential backoff
2. ✅ **Firewall**: Configured and verified
3. ✅ **Admin Rights**: Running as Administrator
4. ✅ **Python Scripts**: Updated and deployed

## ⚠️ Required Manual Steps (One-Time Setup)

### Step 1: Open Generic MT5
- Navigate to: `C:\Program Files\MetaTrader 5\terminal64.exe`
- Or use Start Menu if installed
- **Run as Administrator** (right-click → Run as administrator)

### Step 2: Enable Algorithmic Trading (CRITICAL)
1. In MT5, go to: **Tools → Options**
2. Click on **"Expert Advisors"** tab
3. **CHECK** the box: **"Allow algorithmic trading"** ✅
4. (Optional) **CHECK** the box: **"Allow DLL imports"** ✅
5. Click **OK**

### Step 3: Manual Login
1. Go to: **File → Login to Trade Account**
2. Enter credentials:
   - **Login**: `800107112`
   - **Password**: `Demo@123`
   - **Server**: `ECMarkets-MT5-Demo`
3. Click **Login**
4. Wait for green connection bars (bottom right)

### Step 4: Keep Terminal Open
- **DO NOT close** the MT5 terminal
- Minimize if needed, but **keep it running**
- Python connections require MT5 to be open

## Verification

After completing these steps, test the connection:

```bash
ssh vultr-vps "python -c \"import sys; sys.path.insert(0, r'C:\vps-broker-service\python'); from test_connection import test_connection; result = test_connection('800107112', 'Demo@123', 'ECMarkets-MT5-Demo'); import json; print(json.dumps(result, indent=2))\""
```

**Expected Result**:
```json
{
  "connected": true,
  "account_info": {
    "login": 800107112,
    "name": "Demo Account",
    "server": "ECMarkets-MT5-Demo",
    "balance": 10000.0,
    "equity": 10000.0,
    "currency": "USD",
    "leverage": 500
  }
}
```

## Why Manual Steps Are Required

1. **MT5 Security**: MT5 requires "Allow algorithmic trading" to be manually enabled (security feature)
2. **Initial Activation**: MT5 needs to be logged in at least once to activate IPC server
3. **Configuration Persistence**: Settings are saved after first manual configuration

## After Setup

Once these steps are completed:
- ✅ All future connections will work automatically
- ✅ Retry logic will handle temporary issues
- ✅ Auto-sync journal will function normally
- ✅ No more manual intervention needed

## Troubleshooting

If connection still fails after manual setup:

1. **Restart Generic MT5** (close and reopen)
2. **Verify settings** are still checked
3. **Check firewall** - ensure MT5 is allowed
4. **Run as Administrator** - right-click MT5 → Run as administrator
5. **Verify credentials** - correct login, password, server

## Summary

**Status**: All code fixes applied ✅
**Action Required**: One-time manual configuration ⚠️
**After Setup**: Fully automated ✅

The IPC timeout is resolved once "Allow algorithmic trading" is enabled and MT5 is logged in manually once.









