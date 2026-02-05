# MT5 Path Fixed for Ubuntu VPS

## ✅ Changes Made

Removed hardcoded Windows path `C:\MT5_BrokerService\terminal64.exe` and updated Python scripts to use **auto-detection** for Ubuntu/Linux.

### Files Updated:
1. `vps-broker-service/python/test_connection.py`
2. `vps-broker-service/python/fetch_trades.py`

### Changes:
- **Before**: Hardcoded Windows path `C:\MT5_BrokerService\terminal64.exe`
- **After**: Auto-detect MT5 terminal (let Python library find it)

### Code Change:
```python
# OLD (WRONG):
generic_mt5_path = r"C:\MT5_BrokerService\terminal64.exe"
initialized = mt5.initialize(path=generic_mt5_path, ...)

# NEW (CORRECT):
# Let Python library auto-detect
initialized = mt5.initialize(
    login=login_int,
    password=password,
    server=server,
    timeout=20000
)
```

---

## 🧪 Test Again

Now test the connection again on your Ubuntu VPS:

```bash
python3 python/test_connection.py '{"login":"81071266","password":"Imperial@2026","server":"ECMarkets-MT5-Live01"}'
```

The Python MT5 library should now auto-detect your MT5 installation.

---

## ⚠️ Note

If auto-detection doesn't work, you may need to:
1. Ensure MT5 is installed and running
2. Or provide the correct path if you have a specific MT5 installation location

But for Ubuntu/Linux, auto-detection should work!
