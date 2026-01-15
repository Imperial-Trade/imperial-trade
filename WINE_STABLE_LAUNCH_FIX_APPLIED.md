# Wine Stable Launch Fix Applied

## ✅ Fixes Implemented:

### Step 1: Clean Environment
- ✅ Killed all Wine processes (`wineserver -k`, `killall`)
- ✅ Cleared hanging processes

### Step 2: Stable Launch Command
- ✅ Added `WINEDEBUG=-all` to suppress Wine debug logs
- ✅ This removes "CriticalSection" error noise
- ✅ Prevents Wine from printing warnings while MT5 locks threads

### Step 3: Script Optimization
- ✅ **Separated initialize() and login()** - More stable under Wine
- ✅ **Added 5-second wait** after initialize() for IPC pipe to settle
- ✅ Updated script logic to:
  1. Initialize ONLY (no login parameters)
  2. Wait 5 seconds for IPC pipe
  3. Login separately

### Step 4: Node.js Service Update
- ✅ Added `WINEDEBUG: '-all'` to environment variables in `mt5-client.ts`
- ✅ Applied to both `test-connection` and `fetch-trades` endpoints

## Expected Results:

1. **No more ntdll errors** - WINEDEBUG=-all suppresses Wine debug output
2. **More stable connection** - Separate init/login prevents IPC conflicts
3. **Better IPC communication** - 5-second wait allows pipe to settle
4. **Cleaner logs** - No Wine debug noise in output

## Key Changes:

**test_connection.py:**
- Initialize MT5 first (without login)
- Wait 5 seconds for IPC pipe
- Then call login() separately

**mt5-client.ts:**
- Added `WINEDEBUG: '-all'` to environment for Linux/Wine
