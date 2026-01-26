# 🔧 Error [32] - Complete Fix Guide

## Problem Identified

**Error [32] - Sharing Violation**: Two or more processes are trying to access the same MT5 data files simultaneously, causing:
- Python script to hang waiting for files to become available
- Edge Function to timeout after 60 seconds
- MT5 synchronization to fail
- Blank charts in MT5

## Root Cause

1. **Hidden MT5 processes**: Background MT5 instances locking files
2. **Not using portable mode**: MT5 using shared AppData files
3. **File locks**: MT5 database files (EURUSD, etc.) locked by multiple processes

## Solution Steps

### Step 1: Kill All Ghost Processes

Run on VPS (PowerShell as Administrator):
```powershell
.\vps-setup\FIX_ERROR_32_SHARING_VIOLATION.ps1
```

Or manually:
```powershell
taskkill /F /IM terminal64.exe
taskkill /F /IM python.exe
taskkill /F /IM pythonw.exe
Start-Sleep -Seconds 5
```

### Step 2: Start MT5 in Pure Portable Mode

This ensures MT5 uses isolated files:
```powershell
Start-Process "C:\Program Files\MetaTrader 5\terminal64.exe" -ArgumentList "/portable"
```

**Verify:**
- MT5 opens successfully
- Bottom-right shows "Authorized"
- Connection bars are green/blue

### Step 3: Fix Synchronization Error

If MT5 Journal still shows "synchronization process failed":

**In MT5:**
1. Go to "Symbols" tab (left side)
2. Right-click "EURUSD" (or any symbol with error)
3. Select "Hide All"
4. Right-click again → "Show All"
5. Wait for MT5 to rebuild database

This forces MT5 to release and rebuild locked files.

### Step 4: Monitor Connection Test

**On VPS:**
```powershell
.\vps-setup\MONITOR_CONNECTION_TEST.ps1
```

**On Website:**
- Click "Connect Broker"
- Watch VPS logs

**Expected Results:**
- ✅ `MT5 initialized successfully` = Working!
- ❌ `IPC timeout` or `Wait for sync failed` = Still has Error [32]

## Why Health Test Works But Connection Test Times Out

| Test | What It Does | Time | Status |
|------|-------------|------|--------|
| **Health Test** | Checks if Node.js server is awake | 0.1s | ✅ Works |
| **Connection Test** | Calls Python → MT5 → Waits for sync | 60s+ | ❌ Times out |

**Explanation:**
- Health test doesn't touch MT5 (just checks Node.js)
- Connection test waits for MT5 files to sync
- If Error [32] exists, files never become available
- Python script waits until Edge Function timeout (60s)

## Verification Checklist

After applying fixes:

- [ ] All MT5/Python processes killed
- [ ] MT5 started in portable mode (`/portable` flag)
- [ ] MT5 shows "Authorized" with green/blue bars
- [ ] Symbols tab: EURUSD hidden/shown (rebuild database)
- [ ] VPS logs monitored during connection test
- [ ] Connection test completes successfully
- [ ] No Error [32] in MT5 Journal

## If Error Persists

1. **Check MT5 Journal** (Tools → Journal):
   - Look for "Error [32]" entries
   - Note which symbols are affected

2. **Check for Multiple MT5 Instances**:
   ```powershell
   Get-Process -Name terminal64
   ```
   Should show only ONE process

3. **Verify Portable Mode**:
   - MT5 should use isolated folder
   - Not sharing AppData files

4. **Check File Locks**:
   ```powershell
   # Check if files are locked
   Get-Process | Where-Object {$_.Path -like "*MetaTrader*"}
   ```

5. **Restart VPS Service**:
   ```powershell
   pm2 restart imperial-trade-broker-service
   ```

## Prevention

To prevent Error [32] in the future:

1. **Always use portable mode** for broker service MT5
2. **Kill processes before restarting** MT5
3. **Don't run multiple MT5 instances** simultaneously
4. **Use terminal manager** for isolation (already implemented)

---

**Status**: ✅ **FIX SCRIPT READY - RUN ON VPS**
