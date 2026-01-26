# 📍 Script Location

## File Created

The script `RESTART_MT5_NOW.ps1` has been created directly on the VPS.

## Location

```
C:\vps-broker-service\vps-setup\RESTART_MT5_NOW.ps1
```

## How to Run It

### Option 1: Right-Click (Easiest)
1. In File Explorer, navigate to: `C:\vps-broker-service\vps-setup\`
2. Find: `RESTART_MT5_NOW.ps1`
3. **Right-click** on it
4. Select: **"Run with PowerShell"**
5. Wait for it to complete

### Option 2: PowerShell
1. Open **PowerShell as Administrator**
2. Run:
   ```powershell
   cd C:\vps-broker-service\vps-setup
   .\RESTART_MT5_NOW.ps1
   ```

## What It Does

1. Closes MT5 completely
2. Deletes AppData folder
3. Starts MT5 with `/portable` argument
4. Verifies MT5 restarted

## After Running

**Check MT5:**
1. Go to: **File > Open Data Folder**
2. Should show: `C:\MT5_BrokerService`
3. If it shows `AppData\Roaming`, run the script again

---

**Status**: ✅ **SCRIPT CREATED ON VPS**

**Refresh File Explorer (F5) to see the file!**
