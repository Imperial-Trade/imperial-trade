# IPC Timeout Fix - Complete Summary

## Problem:
IPC timeout error (-10005) when connecting to MT5 via Wine on Ubuntu VPS.

## Root Cause:
Path mismatch - Wine requires Windows-style paths (`C:\...`) but scripts were using Linux paths (`/root/...`).

## Fixes Applied:

### 1. ✅ Created Symlink for Wine
```bash
ln -sfn /root/imperial-factory /root/.wine/drive_c/imperial-factory
```
- Wine can now access MT5 as `C:\imperial-factory\mt5-master\terminal64.exe`

### 2. ✅ Updated All Python Scripts to Use Windows Paths
- **test_connection.py**: Uses `C:\\imperial-factory\\mt5-master\\terminal64.exe`
- **fetch_trades.py**: Uses Windows path format
- **get_servers.py**: Uses Windows path format
- **quick_test.py**: Created for testing

### 3. ✅ Increased Timeout to 60 Seconds
- Changed from `timeout=20000` (20s) to `timeout=60000` (60s)
- Gives Wine's IPC pipe more time to establish

### 4. ✅ Path Resolution Logic
Scripts now check in this order:
1. `/root/.wine/drive_c/imperial-factory/mt5-master/terminal64.exe` → `C:\\imperial-factory\\mt5-master\\terminal64.exe`
2. `/root/.wine/drive_c/Program Files/MetaTrader 5/terminal64.exe` → `C:\\Program Files\\MetaTrader 5\\terminal64.exe`
3. Fallback to Linux path (with warning)

## Testing:
1. ✅ Symlink verified
2. ✅ Files uploaded with Windows paths
3. ✅ Timeout increased to 60s
4. ⏳ Testing connection (in progress)

## Next Steps if Timeout Persists:
1. Check if MT5 terminal actually launches in Wine
2. Verify Wine configuration (winecfg)
3. Check for missing Wine dependencies
4. Consider alternative: Native Windows VPS or Docker Windows container
