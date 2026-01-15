# 🚨 Close the Wrong MT5 Window

## The Problem

You have **TWO MT5 windows open**:
1. **✅ CORRECT**: One from PowerShell (using `C:\MT5_BrokerService`)
2. **❌ WRONG**: One from Desktop shortcut (using `AppData\Roaming`)

## The Solution

**Close the MT5 window that shows `AppData\Roaming` when you click File > Open Data Folder.**

**Keep the one that shows `C:\MT5_BrokerService`.**

## How to Identify Which is Which

1. **Click on each MT5 window**
2. **Go to: File > Open Data Folder**
3. **Check the path:**
   - ✅ **KEEP**: Shows `C:\MT5_BrokerService`
   - ❌ **CLOSE**: Shows `AppData\Roaming`

## After Closing the Wrong One

1. **Verify**: Only ONE MT5 window remains
2. **Check**: File > Open Data Folder shows `C:\MT5_BrokerService`
3. **Test**: Go to website and click "Connect Broker"

---

**Status**: 🔍 **IDENTIFY AND CLOSE THE WRONG WINDOW**

**Close the one showing AppData\Roaming!**
