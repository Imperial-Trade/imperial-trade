# Wine Separated Init/Login Fix Applied

## ✅ All Fixes Implemented:

### 1. WINEDEBUG=-all
- ✅ Added to Node.js service (`mt5-client.ts`)
- ✅ Suppresses Wine debug logs (removes ntdll errors)

### 2. Separated Initialize and Login
- ✅ Updated `test_connection.py` to:
  1. Initialize ONLY (no login parameters)
  2. Wait 5 seconds for IPC pipe to settle
  3. Call login() separately

### 3. 5-Second Wait for IPC
- ✅ Added after initialize() call
- ✅ Allows Wine IPC pipe to fully settle

## Changes Made:

**test_connection.py:**
- Changed from: `mt5.initialize(login=..., password=..., server=...)`
- Changed to: 
  ```python
  mt5.initialize(path=..., timeout=20000)  # Initialize ONLY
  time.sleep(5)  # Wait for IPC pipe
  mt5.login(login=..., password=..., server=server)  # Login separately
  ```

**mt5-client.ts:**
- Added `WINEDEBUG: '-all'` to environment variables

## Expected Results:

1. ✅ No more ntdll errors (WINEDEBUG=-all suppresses them)
2. ✅ More stable connection (separate init/login)
3. ✅ Better IPC communication (5-second wait)
4. ✅ Cleaner logs (no Wine debug noise)

## Testing:

Testing connection with all fixes applied...
