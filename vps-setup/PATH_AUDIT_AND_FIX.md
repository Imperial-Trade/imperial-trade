# 🔍 Complete Path Audit and Fix Plan

## 📁 Correct Directory Structure

### ✅ Broker Service (MT5 User Connections)
```
C:\vps-broker-service\
├── src\                    # Broker service source code
├── python\                 # Broker service Python scripts
├── dist\                   # Compiled broker service
├── .env                    # Broker service config
├── package.json
└── vps-setup\             # Broker service setup scripts ONLY
    ├── DEPLOY_TO_VPS.ps1
    ├── CREATE_MT5_SHORTCUT.ps1
    └── ... (broker service scripts)
```

### ✅ Price Feeder (Live Price Streaming)
```
C:\imperial-price-feeder\
├── src\                    # Price feeder source code
├── dist\                   # Compiled price feeder
├── .env                    # Price feeder config
├── package.json
└── watchdogs\             # Price feeder watchdogs ONLY
    └── price-feeder-watchdog.js
```

### ✅ MT5 Isolated Directories
```
C:\MT5_BrokerService\       # Broker Service MT5 (portable mode)
└── terminal64.exe

C:\Program Files\MetaTrader 5\  # Price Feeder MT5 (standard)
└── terminal64.exe
```

### ✅ Shared Setup Location (Optional)
```
C:\vps-setup\              # Shared VPS setup scripts (if needed)
└── (only truly shared scripts)
```

---

## ❌ Current Problems

### Problem 1: Price Feeder Scripts in Wrong Location
- **Current**: `C:\vps-broker-service\vps-setup\VERIFY_AND_ENSURE_24_7.ps1`
- **Should be**: `C:\imperial-price-feeder\setup\VERIFY_AND_ENSURE_24_7.ps1`

### Problem 2: Watchdog in Wrong Location
- **Current**: `C:\vps-broker-service\vps-setup\imperial-watchdogs\price-feeder-watchdog.js`
- **Should be**: `C:\imperial-price-feeder\watchdogs\price-feeder-watchdog.js`

### Problem 3: Confusing Folder Names
- `vps-setup` folder is in broker service but contains price feeder scripts
- Need to separate clearly

---

## ✅ Fix Plan

### Step 1: Move Price Feeder Scripts
- Move `VERIFY_AND_ENSURE_24_7.ps1` to `C:\imperial-price-feeder\setup\`
- Update all references in documentation

### Step 2: Move Watchdog
- Move `price-feeder-watchdog.js` to `C:\imperial-price-feeder\watchdogs\`
- Update PM2 start command

### Step 3: Update All References
- Fix all file paths in scripts
- Fix all documentation references
- Ensure no cross-references

### Step 4: Verify Separation
- Broker Service: Only in `C:\vps-broker-service\`
- Price Feeder: Only in `C:\imperial-price-feeder\`
- MT5 Broker: Only in `C:\MT5_BrokerService\`
- No shared folders

---

## 📋 Files to Fix

### Scripts to Update:
1. `VERIFY_AND_ENSURE_24_7.ps1` - Update watchdog path
2. All documentation files - Update paths
3. PM2 startup commands - Update watchdog path

### Documentation to Update:
1. All files mentioning `vps-broker-service\vps-setup` for price feeder
2. All watchdog references
3. All setup script references

---

**Status**: 🔍 **AUDITING AND FIXING**
