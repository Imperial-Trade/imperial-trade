# VPS MT5 EA Verification and Setup

## ✅ Verification Results:

### MT5 Installation:
- ✅ **MT5 Terminal**: `/root/imperial-factory/mt5-master/terminal64.exe` (127MB, exists)
- ✅ **MQL5 Directory**: `/root/imperial-factory/mt5-master/MQL5/` (exists)
- ✅ **Experts Directory**: `/root/imperial-factory/mt5-master/MQL5/Experts/` (exists)

### EA File Status:
- ✅ **ImperialSync.mq5**: Uploaded to VPS
- 📍 **Location**: `/root/imperial-factory/mt5-master/MQL5/Experts/ImperialSync.mq5`

## 📋 Next Steps:

1. **Compile the EA** (needs to be done in MT5 MetaEditor on the VPS)
2. **Attach EA to a chart** in MT5
3. **Verify WebRequest URL** is added to MT5 Options

## 🔧 To Compile EA on VPS:

Since MT5 is running on the VPS, you'll need to:
1. Access MT5 MetaEditor (via remote desktop or Wine GUI)
2. Open `ImperialSync.mq5`
3. Compile (F7)
4. The compiled `.ex5` file will be created automatically
