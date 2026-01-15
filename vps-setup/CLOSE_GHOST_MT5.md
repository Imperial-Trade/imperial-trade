# 🚨 CRITICAL: Close the "Ghost" MT5

## The Problem
You are 100% correct.
1. The **PowerShell command** launched the CORRECT one (`C:\MT5_BrokerService`).
2. The **Desktop Shortcut** (MT5 Logo) launched the WRONG one (`AppData\Roaming`).

This is why you see "Roaming" in the file explorer. You have the "Bad" MT5 open right now.

## The Fix
1. **Close the MT5 window** that is currently open (the one showing AppData).
2. **Do NOT use the Desktop Shortcut.** It points to the old installation.
3. Instead, open File Explorer.
4. Go to `C:\MT5_BrokerService`.
5. Double-click `terminal64.exe` inside that folder.

## Verification
When the new window opens:
1. Go to **File > Open Data Folder**.
2. It MUST say `C:\MT5_BrokerService`.

## Cleanup (Optional but Recommended)
Delete the "MetaTrader 5" shortcut from your desktop so you don't accidentally click it again.
Right-click the Desktop Shortcut > Delete.

---
**Status**: ⚠️ **WRONG WINDOW OPEN - CLOSE IT NOW**
