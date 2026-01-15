# Wine Path Fix Applied - IPC Timeout Resolution

## Problem:
IPC timeout error (-10005) caused by path mismatch - Linux paths (`/root/...`) don't work in Wine, which needs Windows paths (`C:\...`).

## Fixes Applied:

### 1. ✅ Created Symlink
- Created: `/root/.wine/drive_c/imperial-factory` → `/root/imperial-factory`
- Wine can now access MT5 as `C:\imperial-factory\mt5-master\terminal64.exe`

### 2. ✅ Updated Python Scripts to Use Windows Paths
All scripts now:
- **First check**: `/root/.wine/drive_c/imperial-factory/mt5-master/terminal64.exe` → Use `C:\\imperial-factory\\mt5-master\\terminal64.exe`
- **Second check**: `/root/.wine/drive_c/Program Files/MetaTrader 5/terminal64.exe` → Use `C:\\Program Files\\MetaTrader 5\\terminal64.exe`
- **Fallback**: Linux path (with warning)

### 3. ✅ Files Updated:
- `test_connection.py` - Uses Windows paths
- `fetch_trades.py` - Uses Windows paths
- `get_servers.py` - Uses Windows paths
- `quick_test.py` - Created for testing

## Testing:
Run the quick test:
```bash
wineserver -k && killall -9 Xvfb wineserver wine64 wine
WINEDEBUG=-all xvfb-run -a wine /root/.wine/drive_c/Python310/python.exe quick_test.py '{"login":81071266,"password":"Imperial@2026","server":"ECMarkets-MT5-Live01"}'
```

## Expected Result:
- MT5 should initialize successfully
- No IPC timeout errors
- Connection should complete within 60 seconds
