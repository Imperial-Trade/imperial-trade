# Upload Python Files to VPS

## Files That Need to Be on VPS

These Python files exist locally but need to be on your Ubuntu VPS:

1. ✅ `vps-broker-service/python/test_connection.py` (FIXED - uses auto-detection)
2. ✅ `vps-broker-service/python/fetch_trades.py` (FIXED - uses auto-detection)
3. ✅ `vps-broker-service/python/mt5_error_handler.py` (Required dependency)

---

## Quick Upload Commands

### Step 1: Find Where to Upload

On VPS, find where the Node.js service expects the files:

```bash
# Find Node.js service location
pm2 info imperial-trade-broker-service | grep "script path"

# Or check common locations
ls -la /opt/vps-broker-service/python/ 2>/dev/null
ls -la /root/vps-broker-service/python/ 2>/dev/null
```

### Step 2: Upload Files (from your local machine)

```bash
# Replace /path/to/vps-broker-service with actual path from Step 1
scp vps-broker-service/python/test_connection.py root@209.222.12.247:/path/to/vps-broker-service/python/
scp vps-broker-service/python/fetch_trades.py root@209.222.12.247:/path/to/vps-broker-service/python/
scp vps-broker-service/python/mt5_error_handler.py root@209.222.12.247:/path/to/vps-broker-service/python/
```

### Step 3: Verify on VPS

```bash
# SSH into VPS
ssh root@209.222.12.247

# Check files exist
ls -la /path/to/vps-broker-service/python/test_connection.py
ls -la /path/to/vps-broker-service/python/fetch_trades.py

# Make executable
chmod +x /path/to/vps-broker-service/python/*.py
```

---

## Alternative: Create Files Directly on VPS

If you can't upload, you can create the files directly on the VPS by copying the content.

**The fixed files are ready - they just need to be on the VPS!**
