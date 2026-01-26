# Wine Path Fix - IPC Timeout Resolution

## Problem Identified:
The IPC timeout error (-10005) was caused by a **path mismatch** between Linux paths (`/root/...`) and Windows paths (`C:\...`) in the Wine environment.

## Fixes Applied:

### 1. ✅ Created Symlink for Wine
- Created symlink: `/root/.wine/drive_c/imperial-factory` → `/root/imperial-factory`
- This allows Wine to access the MT5 terminal as a Windows path

### 2. ✅ Updated Python Scripts to Use Windows Paths
- **test_connection.py**: Updated to use `C:\\imperial-factory\\mt5-master\\terminal64.exe`
- **fetch_trades.py**: Updated to use Windows path format
- Scripts now check for symlink first, then fall back to other paths

### 3. ✅ Created Quick Test Script
- Created `quick_test.py` for manual verification
- Uses minimal error handling to see raw results
- Tests the connection with clean Wine environment

## Path Resolution Logic:
1. First checks: `/root/.wine/drive_c/imperial-factory/mt5-master/terminal64.exe` → Uses `C:\\imperial-factory\\mt5-master\\terminal64.exe`
2. Second checks: `/root/.wine/drive_c/Program Files/MetaTrader 5/terminal64.exe` → Uses `C:\\Program Files\\MetaTrader 5\\terminal64.exe`
3. Fallback: `/root/imperial-factory/mt5-master/terminal64.exe` → Linux path (may cause issues)

## Testing:
Run the quick test script:
```bash
wineserver -k && killall -9 Xvfb wineserver wine64 wine
WINEDEBUG=-all xvfb-run -a wine /root/.wine/drive_c/Python310/python.exe quick_test.py
```

Or with credentials:
```bash
WINEDEBUG=-all xvfb-run -a wine /root/.wine/drive_c/Python310/python.exe quick_test.py '{"login":81071266,"password":"Imperial@2026","server":"ECMarkets-MT5-Live01"}'
```
