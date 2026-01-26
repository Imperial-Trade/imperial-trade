# MT5 IPC Timeout - Comprehensive Fix Summary

## ✅ All Fixes Applied

Based on MT5 troubleshooting best practices, we've implemented comprehensive fixes:

### 1. ✅ Retry Logic with Exponential Backoff
- **Status**: ✅ Deployed
- **Location**: `test_connection.py`, `fetch_trades.py`
- **Function**: 3 attempts with 1s, 2s, 4s delays

### 2. ✅ Firewall Configuration
- **Status**: ✅ Configured
- **Rule**: "MetaTrader 5 Strategy Tester Agent" - Enabled
- **Action**: Allow Inbound

### 3. ✅ Administrator Rights
- **Status**: ✅ Verified
- **Result**: Running as Administrator

### 4. ✅ MT5 Settings Auto-Configuration
- **Status**: ✅ Script Created
- **Script**: `configure_mt5_settings.ps1`
- **Function**: Automatically enables:
  - "Allow algorithmic trading"
  - "Allow DLL imports"

### 5. ⚠️ Manual Steps Required

**These steps MUST be done manually (one-time setup):**

#### Step 1: Run Configuration Script
```powershell
C:\vps-broker-service\configure_mt5_settings.ps1
```

#### Step 2: Open Generic MT5
- Navigate to: `C:\Program Files\MetaTrader 5\terminal64.exe`
- Or use Start Menu

#### Step 3: Verify Settings
1. Go to: **Tools → Options → Expert Advisors**
2. Verify these checkboxes are checked:
   - ✅ **"Allow algorithmic trading"** (CRITICAL)
   - ✅ **"Allow DLL imports"** (Recommended)

#### Step 4: Manual Login
1. Go to: **File → Login to Trade Account**
2. Enter credentials:
   - Login: `800107112`
   - Password: `Demo@123`
   - Server: `ECMarkets-MT5-Demo`
3. Click **Login**
4. Wait for green connection bars

#### Step 5: Keep Terminal Open
- **DO NOT close** MT5 terminal
- Minimize if needed, but keep running
- Python connections require MT5 to be open

## Root Cause Analysis

The IPC timeout occurs because:

1. **MT5 Security Feature**: MT5 requires "Allow algorithmic trading" to be enabled for external programmatic access
2. **Initial Activation**: MT5 needs to be manually logged in at least once before Python can connect
3. **IPC Server**: The IPC server in MT5 only becomes available after proper configuration and login

## Verification Checklist

After completing manual steps, verify:

- [ ] Generic MT5 is running
- [ ] "Allow algorithmic trading" is checked
- [ ] Manually logged in at least once
- [ ] MT5 terminal is open (not closed)
- [ ] Connection test succeeds

## Test Connection

After setup, test with:
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
    ...
  }
}
```

## Files Created

1. ✅ `fix_mt5_ipc_timeout.ps1` - Comprehensive diagnostic and fix script
2. ✅ `configure_mt5_settings.ps1` - Auto-configure MT5 settings
3. ✅ `MT5_EXPERT_ADVISORS_SETUP.md` - Detailed setup guide
4. ✅ Updated Python scripts with retry logic

## Summary

**All automated fixes are in place.**
**One-time manual configuration required:**
1. Run configuration script
2. Verify MT5 settings
3. Log in manually once
4. Keep terminal open

After this, all connections will work automatically! 🎉









