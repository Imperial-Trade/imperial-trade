# MT5 and Broker Service Connection - Complete Explanation

## 📍 What is Where:

### 1. **MT5 Terminal Installation** (Separate)
- **Location**: `/root/imperial-factory/mt5-master/terminal64.exe`
- **Type**: MetaTrader 5 terminal executable
- **Status**: ✅ Installed (127MB file exists)
- **Purpose**: The actual MT5 trading terminal

### 2. **imperial-broker-service** (Node.js HTTP Server)
- **Service Name**: `imperial-broker-service`
- **Location**: `/root/imperial-factory/broker-service/`
- **Status**: ✅ Running on PM2 (port 3001)
- **Purpose**: HTTP API that receives requests from Supabase Edge Functions

### 3. **Python Scripts** (Bridge between Node.js and MT5)
- **Location**: `/root/imperial-factory/broker-service/python/`
- **Scripts**: 
  - `test_connection.py` - Tests MT5 login
  - `fetch_trades.py` - Fetches trade history
- **Purpose**: Use MetaTrader5 Python library to communicate with MT5

## 🔗 How They Connect:

```
Frontend (Browser)
    ↓
    HTTP Request
    ↓
Supabase Edge Function (test-broker-connection)
    ↓
    HTTP Request to VPS
    ↓
imperial-broker-service (Node.js on PM2, port 3001)
    ↓
    Spawns Python process (wine C:\Python310\python.exe)
    ↓
Python Script (test_connection.py)
    ↓
    Uses MetaTrader5 Python library
    ↓
MetaTrader5 Library connects via IPC to MT5 Terminal
    ↓
/root/imperial-factory/mt5-master/terminal64.exe
    ↓
    Connects to Broker Server (e.g., ECMarkets-MT5-Live01)
```

## ✅ Will It Work to Connect MT5 Credentials?

**Yes, but with one requirement:**

The MT5 terminal (`terminal64.exe`) needs to be **running** for the Python library to connect to it via IPC (Inter-Process Communication).

### Current Status:
- ✅ MT5 terminal file exists: `/root/imperial-factory/mt5-master/terminal64.exe`
- ✅ MetaTrader5 Python library installed
- ✅ Python scripts configured correctly
- ✅ Broker service running
- ⚠️ **MT5 terminal process needs to be running** (the IPC error suggests it's not running)

### To Make It Work:

The MT5 terminal needs to be started. The Python library doesn't start MT5 automatically - it connects to an already-running MT5 process.

**Options:**
1. **Manual Start**: Run MT5 terminal manually (in Wine)
2. **Auto-Start Script**: Create a script to start MT5 automatically
3. **Service/Background**: Run MT5 as a background service

## Summary:

- **imperial-broker-service** = HTTP API server (receives requests)
- **Python Scripts** = Bridge (communicate with MT5)
- **MT5 Terminal** = Trading platform (needs to be running)
- **They work together** to connect credentials and fetch trades

The connection **will work** once MT5 terminal is running!
