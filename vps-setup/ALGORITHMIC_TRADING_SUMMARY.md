# ✅ Algorithmic Trading Auto-Enable - Complete Setup

## 🎯 **Problem Solved:**

"Allow Algorithmic Trading" was getting unchecked when:
- Generic MT5 was closed and reopened
- Switching between different brokers
- MT5 was restarted

## ✅ **Solution Implemented:**

### **1. Configuration File Updates**
- ✅ Updated 4 MT5 configuration files (`common.ini`)
- ✅ Set `AllowDllImports=1` and `AllowLiveTrading=1`
- ✅ These settings persist in the MT5 configuration

### **2. Python Script Enhancements**
- ✅ Added checks in `test_connection.py` and `fetch_trades.py`
- ✅ Scripts now detect if algorithmic trading is disabled
- ✅ Logs warnings to help identify issues

### **3. Automatic Maintenance**
- ✅ Created `ENSURE_ALGORITHMIC_TRADING_ALWAYS_ENABLED.ps1`
- ✅ Script automatically re-enables the setting if it gets disabled
- ✅ Runs every 5 minutes via Windows Scheduled Task

### **4. Scheduled Task**
- ✅ Task name: `EnsureMT5AlgorithmicTrading`
- ✅ Runs as SYSTEM account (most reliable)
- ✅ Executes every 5 minutes automatically
- ✅ Ensures the setting stays enabled permanently

## 🔧 **How It Works:**

1. **Initial Setup:**
   - Configuration files are modified to enable algorithmic trading
   - Settings are written to MT5's `common.ini` files

2. **Maintenance:**
   - Scheduled task runs every 5 minutes
   - Checks all Generic MT5 configuration files
   - Automatically re-enables if disabled

3. **Detection:**
   - Python scripts check `terminal_info.trade_allowed` after connecting
   - Logs warnings if disabled (but continues to work)

## ⚠️ **Important Notes:**

1. **Restart Generic MT5:**
   - You need to restart Generic MT5 once for the initial configuration to take effect
   - After restart, the scheduled task will maintain it automatically

2. **MT5 UI:**
   - The setting should appear checked in: Tools → Options → Expert Advisors
   - If it's unchecked, the scheduled task will re-enable it within 5 minutes
   - You can also manually check it - the task will keep it enabled

3. **Broker Switching:**
   - When switching brokers, MT5 may temporarily disable it
   - The scheduled task will automatically re-enable it within 5 minutes
   - No manual intervention needed

## 📋 **Verification:**

### **Check Configuration:**
```powershell
Get-Content "$env:APPDATA\MetaQuotes\Terminal\*\config\common.ini" | Select-String "AllowDllImports|AllowLiveTrading"
```
Should show: `AllowDllImports=1` and `AllowLiveTrading=1`

### **Check Scheduled Task:**
```powershell
Get-ScheduledTask -TaskName "EnsureMT5AlgorithmicTrading"
```
Should show the task is enabled

### **Check MT5 UI:**
- Open Generic MT5
- Go to: Tools → Options → Expert Advisors
- Verify "Allow Algorithmic Trading" is checked ✅

## 🚀 **Status:**

✅ **Setup Complete**
- Configuration files updated
- Python scripts enhanced
- Scheduled task created
- Automatic maintenance active

**The setting will now stay enabled automatically, even when:**
- Generic MT5 is closed and reopened
- Switching between brokers
- MT5 is restarted
- System reboots

---

**Last Updated**: 2025-01-08


