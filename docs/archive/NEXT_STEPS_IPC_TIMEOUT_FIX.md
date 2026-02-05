# Next Steps - IPC Timeout Fix

## Changes Applied:

### 1. ✅ Increased Timeout to 60 seconds
- Updated `test_connection.py` to use `timeout=60000` (60 seconds) instead of 20000ms
- This gives Wine's IPC pipe more time to establish

### 2. ✅ Windows Path Format
- All scripts now use `C:\\imperial-factory\\mt5-master\\terminal64.exe`
- Symlink created: `/root/.wine/drive_c/imperial-factory` → `/root/imperial-factory`

### 3. ✅ Testing Steps:
1. Test MT5 terminal can launch directly
2. Test connection via Node.js service
3. Check PM2 logs for detailed error messages

## If IPC Timeout Persists:

The IPC timeout (-10005) may indicate:
1. **MT5 Terminal Not Starting**: The terminal.exe may not be launching in Wine
2. **Wine Compatibility Issue**: MT5 may not be fully compatible with Wine
3. **Permission Issues**: MT5 may need specific permissions
4. **Missing Dependencies**: Wine may be missing required DLLs

## Alternative Solutions:

1. **Native Windows VPS**: Use a Windows VPS instead of Ubuntu/Wine
2. **Docker with Windows Container**: Run MT5 in a Windows Docker container
3. **Wine Configuration**: Further Wine tuning (winecfg, winetricks)
4. **MT5 Alternative**: Use MT5 WebAPI or REST API if available

## Current Status:
- ✅ Path format fixed (Windows paths)
- ✅ Timeout increased (60 seconds)
- ✅ Symlink created
- ⚠️  Still testing connection
