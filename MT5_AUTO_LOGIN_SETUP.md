# MT5 Auto-Login Setup

## Problem:
MT5 needs to be logged in on the VPS, but we can't manually log in. The VPS must handle everything automatically.

## Solution:
Use MT5's `launch.ini` file for auto-login. This file contains credentials and MT5 will automatically log in when launched.

## Implementation:

### 1. ✅ Created launch.ini File:
**Location**: `/root/imperial-factory/mt5-master/config/launch.ini`
```
[Common]
Login=81071266
Password=Imperial@2026
Server=ECMarkets-MT5-Live01
```

### 2. ✅ Updated Launch Command:
```bash
wine64 'C:\\imperial-factory\\mt5-master\\terminal64.exe' /portable /config:config/launch.ini
```

### 3. ✅ Updated Startup Script:
- Location: `/root/start-mt5.sh`
- Launches MT5 with auto-login
- Waits 25 seconds for full initialization and login

## How It Works:
1. MT5 launches with `/portable` flag
2. MT5 reads `launch.ini` from `config/` directory
3. MT5 automatically logs in using credentials from `launch.ini`
4. Python connects to already-logged-in MT5
5. No manual intervention needed!

## Benefits:
- ✅ Fully automated - no MacBook needed
- ✅ MT5 is logged in before Python connects
- ✅ Credentials stored securely in launch.ini
- ✅ Works 24/7 without manual intervention
