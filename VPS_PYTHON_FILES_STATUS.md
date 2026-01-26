# Python Files Status on VPS

## Issue
The user says `test_connection.py` doesn't exist on the Ubuntu VPS.

## Files That Should Exist

Based on the codebase, these Python files are needed:

### Required Files:
1. **`test_connection.py`** - Tests MT5 connection
2. **`fetch_trades.py`** - Fetches trades from MT5
3. **`mt5_error_handler.py`** - Error handling utilities

### Optional Files:
- `get_servers.py` - Gets available servers
- `get_account_info.py` - Gets account info
- Other test files

---

## Solution

The Python files need to be **uploaded/synced to the VPS**.

### Option 1: Check if files exist in different location
```bash
# On VPS, search for Python files
find / -name "test_connection.py" 2>/dev/null
find / -name "fetch_trades.py" 2>/dev/null
```

### Option 2: Upload files to VPS
The files need to be copied to:
```
/path/to/vps-broker-service/python/
```

### Option 3: Check Node.js service location
The Node.js service expects Python files at:
```
/path/to/vps-broker-service/python/test_connection.py
```

---

## What the Node.js Service Expects

From `mt5-client.ts`, the service calls:
```typescript
const pythonScript = path.join(__dirname, '../python/test_connection.py');
```

So if Node.js service is at `/opt/vps-broker-service/src/index.ts`, 
Python files should be at `/opt/vps-broker-service/python/test_connection.py`

---

**Need to verify where the files are on the VPS or upload them!**
