# 🚨 CRITICAL: You MUST Use /portable Argument

## The Problem

**Double-clicking `terminal64.exe` does NOT use portable mode!**

Even if you open it from `C:\MT5_BrokerService`, MT5 will still use `AppData\Roaming` unless you explicitly use the `/portable` argument.

## The Solution

I've just executed commands to:
1. ✅ Close all MT5 instances
2. ✅ Delete AppData folder
3. ✅ Create a desktop shortcut that ALWAYS uses `/portable`
4. ✅ Launch MT5 with `/portable` argument

## What You Should See

**On the VPS:**
- All MT5 windows will close
- A new MT5 window will open
- A new shortcut appears on desktop: `MT5_BrokerService_Portable.lnk`

## Verification

**After MT5 opens:**
1. Go to: **File > Open Data Folder**
2. **MUST show**: `C:\MT5_BrokerService`
3. **If it shows AppData**: Close it and double-click the NEW shortcut on desktop

## Going Forward

**ALWAYS use the desktop shortcut:**
- `MT5_BrokerService_Portable.lnk`
- This shortcut ALWAYS uses `/portable` argument
- Never double-click `terminal64.exe` directly

---

**Status**: ✅ **SHORTCUT CREATED AND MT5 LAUNCHED**

**Verify the Data Folder shows `C:\MT5_BrokerService`!**
