# ✅ Removed All MT5_BrokerService References

## Files Updated

### 1. ✅ `vps-broker-service/python/get_servers.py`
- **Removed**: `C:\MT5_BrokerService\terminal64.exe` hardcoded path
- **Changed to**: Auto-detection (`mt5.initialize()` without path)

### 2. ✅ `vps-broker-service/src/terminal-manager.ts`
- **Removed**: `C:\MT5_BrokerService\terminal64.exe` default path
- **Changed to**: `undefined` (triggers auto-detection) or use `MT5_TERMINAL_PATH` env var if set

### 3. ✅ `vps-broker-service/python/test_connection.py` (already fixed)
- ✅ Already using auto-detection

### 4. ✅ `vps-broker-service/python/fetch_trades.py` (already fixed)
- ✅ Already using auto-detection

---

## Summary

All hardcoded `MT5_BrokerService` Windows paths have been removed. The code now:
- ✅ Uses auto-detection for Ubuntu/Linux
- ✅ Can use `MT5_TERMINAL_PATH` environment variable if needed
- ✅ No Windows-specific paths hardcoded

---

## Environment Variables (Optional)

If you need to specify a custom MT5 path on Ubuntu, you can set:
```bash
export MT5_TERMINAL_PATH=/path/to/terminal64.exe
export MT5_TERMINALS_DATA_PATH=/path/to/data
```

But for Ubuntu/Wine, **auto-detection should work** since MT5 is already running!

---

**All files updated! Ready for Ubuntu VPS!**
