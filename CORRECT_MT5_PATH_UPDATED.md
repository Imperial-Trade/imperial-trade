# ✅ Updated to Use Correct MT5 Path on Ubuntu VPS

## Correct Path Found
**Ubuntu VPS MT5 Path**: `/root/imperial-factory/mt5-master/terminal64.exe`

---

## Files Updated

### 1. ✅ `vps-broker-service/python/test_connection.py`
- **Now checks for**: `/root/imperial-factory/mt5-master/terminal64.exe`
- **Uses this path if it exists**, otherwise falls back to auto-detection

### 2. ✅ `vps-broker-service/python/fetch_trades.py`
- **Now checks for**: `/root/imperial-factory/mt5-master/terminal64.exe`
- **Uses this path if it exists**, otherwise falls back to auto-detection

### 3. ✅ `vps-broker-service/python/get_servers.py`
- **Now checks for**: `/root/imperial-factory/mt5-master/terminal64.exe`
- **Uses this path if it exists**, otherwise falls back to auto-detection

### 4. ✅ `vps-broker-service/src/terminal-manager.ts`
- **Default path updated to**: `/root/imperial-factory/mt5-master/terminal64.exe`

---

## How It Works

The Python scripts now:
1. **Check if** `/root/imperial-factory/mt5-master/terminal64.exe` exists
2. **If yes**: Use that path
3. **If no**: Fall back to auto-detection

---

## Test Command (After Uploading Files)

```bash
# On VPS, test the connection
python3 /path/to/vps-broker-service/python/test_connection.py '{"login":"81071266","password":"Imperial@2026","server":"ECMarkets-MT5-Live01"}'
```

---

**All files updated to use the correct Ubuntu VPS MT5 path! ✅**
