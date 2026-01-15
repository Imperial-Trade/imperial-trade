# Ubuntu VPS MT5 Setup - Verified ✅

## Current Status (from your VPS output):

### ✅ MT5 is Running
```
Process: terminal64.exe
Path in Wine: 2:\mt5\terminal64.exe
Actual Path: ~/.wine/drive_c/mt5/terminal64.exe
Mode: Portable
Config: /mt5/config/launch.ini
```

### ✅ Wine is Installed
```
Version: wine-6.0.3 (Ubuntu 6.0.3~repack-1)
```

### ✅ MT5 Files Found
```
/root/imperial-factory/mt5-master/terminal64.exe
```

---

## Correct MT5 Path for Ubuntu/Wine

The actual MT5 path in Wine is:
- **Wine notation**: `Z:\mt5\terminal64.exe` (or `2:\mt5\terminal64.exe`)
- **Linux path**: `~/.wine/drive_c/mt5/terminal64.exe`

**NOT** `C:\MT5_BrokerService\terminal64.exe` (that was wrong!)

---

## Python Script Status

The Python scripts I fixed will now:
1. **Auto-detect MT5** (preferred - since MT5 is already running)
2. **OR** use the correct path if you want to specify it

Since MT5 is **already running**, auto-detection should work!

---

## Test Command (Run on VPS)

```bash
# First, find where the Python script is
find / -name "test_connection.py" 2>/dev/null | head -3

# Then navigate to that directory and test
cd /path/to/vps-broker-service
python3 python/test_connection.py '{"login":"81071266","password":"Imperial@2026","server":"ECMarkets-MT5-Live01"}'
```

---

## Expected Result

Since MT5 is already running, the Python library should:
- ✅ Auto-detect the running MT5 process
- ✅ Connect to it
- ✅ Test the credentials

---

**Your MT5 is running! The test should work now with auto-detection.**
