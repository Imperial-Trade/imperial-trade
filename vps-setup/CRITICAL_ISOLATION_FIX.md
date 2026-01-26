# 🚨 CRITICAL: MT5 Isolation Issue - Error [32] Root Cause

## The Problem

**Both services are using `terminal64.exe` and may be sharing the same MT5 instance!**

### Current Setup

1. **Imperial Price Feeder**
   - Uses: EC Markets MT5 (or Generic MT5 if EC Markets not installed)
   - Process: `terminal64.exe`
   - Data: `%APPDATA%\MetaQuotes\Terminal\[ID]`

2. **Imperial Trade Broker Service**
   - Uses: Generic MT5
   - Process: `terminal64.exe`
   - Data: `%APPDATA%\MetaQuotes\Terminal\[ID]`

### Why Error [32] Occurs

If both services access the **same MT5 data files**:
- Price Feeder reads/writes to MT5 files
- Broker Service tries to read/write to **same files**
- Windows blocks access → **Error [32] - Sharing Violation**
- Python script hangs waiting for files to unlock
- Edge Function times out after 60 seconds

## Solution: Proper Isolation

### Option 1: Separate MT5 Installations (Best)

**Price Feeder:**
- Uses: EC Markets MT5 installation
- Path: `C:\Program Files\EC Markets MetaTrader 5\terminal64.exe`
- Data: Isolated in `%APPDATA%\MetaQuotes\Terminal\[ECMarkets_ID]`

**Broker Service:**
- Uses: Generic MT5 installation
- Path: `C:\Program Files\MetaTrader 5\terminal64.exe`
- Data: Isolated in `%APPDATA%\MetaQuotes\Terminal\[Generic_ID]`

### Option 2: Portable Mode (Recommended)

**Price Feeder:**
- Uses: EC Markets MT5 (or Generic if EC Markets not installed)
- Portable: `C:\MT5_PriceFeeder`
- Isolated: Yes (separate data directory)

**Broker Service:**
- Uses: Generic MT5
- Portable: `C:\vps-broker-service\terminals\terminal_X` (already implemented)
- Isolated: Yes (separate data directory)

## Immediate Actions

### Step 1: Check Current Isolation

**On VPS:**
```powershell
cd C:\vps-broker-service\vps-setup
.\CHECK_MT5_ISOLATION.ps1
```

This will show:
- Number of MT5 processes running
- Which services are active
- Data directory locations
- File lock status

### Step 2: Fix Isolation

**On VPS:**
```powershell
cd C:\vps-broker-service\vps-setup
.\FIX_MT5_ISOLATION.ps1
```

This will:
- Kill all MT5 processes
- Create isolated directories
- Start Price Feeder MT5 (portable)
- Start Broker Service MT5 (portable)
- Verify isolation

### Step 3: Verify Fix

**Check processes:**
```powershell
Get-Process -Name terminal64
```
Should show **2 processes** (one for each service)

**Check isolation:**
```powershell
.\CHECK_MT5_ISOLATION.ps1
```

## Expected Results After Fix

- ✅ **2 MT5 processes** running (isolated)
- ✅ **Separate data directories** (no file sharing)
- ✅ **No Error [32]** in MT5 Journal
- ✅ **Connection test completes** in <60 seconds
- ✅ **Both services work** simultaneously

## Why This Fixes Error [32]

| Before | After |
|--------|-------|
| Both services share same MT5 files | Each service has isolated files |
| File locks cause Error [32] | No file locks |
| Python script hangs | Python script completes |
| Edge Function times out | Edge Function succeeds |

## Verification Checklist

After running the fix:

- [ ] `CHECK_MT5_ISOLATION.ps1` shows 2 MT5 processes
- [ ] Each process uses different data directory
- [ ] No Error [32] in MT5 Journal
- [ ] Connection test completes successfully
- [ ] Both services running simultaneously
- [ ] Price Feeder still working
- [ ] Broker Service connection works

---

**Status**: 🚨 **CRITICAL FIX - RUN IMMEDIATELY**

Run `CHECK_MT5_ISOLATION.ps1` first to diagnose, then `FIX_MT5_ISOLATION.ps1` to fix!
