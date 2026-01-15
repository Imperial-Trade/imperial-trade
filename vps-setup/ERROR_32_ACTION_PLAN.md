# 🎯 Error [32] - Action Plan

## Immediate Actions Required

### On VPS (Run These Commands)

**Option 1: Quick Fix (Recommended)**
```powershell
cd C:\vps-broker-service\vps-setup
.\QUICK_FIX_ERROR_32.ps1
```

**Option 2: Detailed Fix**
```powershell
cd C:\vps-broker-service\vps-setup
.\FIX_ERROR_32_SHARING_VIOLATION.ps1
```

### Manual Steps in MT5

1. **Wait for MT5 to open** (after running script)
2. **Verify connection**:
   - Bottom-right shows "Authorized"
   - Connection bars are green/blue
3. **Fix synchronization**:
   - Go to "Symbols" tab (left side)
   - Right-click "EURUSD"
   - Select "Hide All"
   - Right-click again → "Show All"
   - Wait for database rebuild

### Monitor Connection Test

**On VPS:**
```powershell
pm2 logs imperial-trade-broker-service
```

**On Website:**
- Click "Connect Broker"
- Watch VPS logs for:
  - ✅ `MT5 initialized successfully` = Success!
  - ❌ `IPC timeout` = Still has Error [32]

## What This Fixes

- ✅ Kills all ghost MT5/Python processes
- ✅ Starts MT5 in isolated portable mode
- ✅ Forces MT5 to rebuild locked database files
- ✅ Prevents file sharing violations

## Expected Result

After running the fix:
- Connection test should complete in <60 seconds
- No more Edge Function timeout
- MT5 chart shows data (not blank)
- Account stays logged in

---

**Status**: ✅ **READY TO RUN ON VPS**
