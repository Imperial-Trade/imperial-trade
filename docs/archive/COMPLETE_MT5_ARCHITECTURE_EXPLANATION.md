# Complete MT5 Architecture Explanation

## 🏗️ System Architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Browser)                        │
│              User enters MT5 credentials                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓ HTTP Request
┌─────────────────────────────────────────────────────────────┐
│              SUPABASE EDGE FUNCTION                          │
│          test-broker-connection / sync-broker-trades        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓ HTTP Request (Port 3001)
┌─────────────────────────────────────────────────────────────┐
│         imperial-broker-service (Node.js)                    │
│         Running on PM2, Port 3001                            │
│         Location: /root/imperial-factory/broker-service/    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓ Spawns Python Process
┌─────────────────────────────────────────────────────────────┐
│              PYTHON SCRIPT (test_connection.py)              │
│         Uses: wine C:\Python310\python.exe                  │
│         Location: .../broker-service/python/                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓ MetaTrader5 Python Library
┌─────────────────────────────────────────────────────────────┐
│            META trader5 PYTHON LIBRARY                       │
│         (Installed in Wine Python)                          │
│         Version: 5.0.5488                                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓ IPC (Inter-Process Communication)
┌─────────────────────────────────────────────────────────────┐
│              MT5 TERMINAL (terminal64.exe)                   │
│         Location: /root/imperial-factory/mt5-master/        │
│         Must be RUNNING for Python library to connect       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓ Internet Connection
┌─────────────────────────────────────────────────────────────┐
│              BROKER SERVER (e.g., ECMarkets-MT5-Live01)      │
│         Connects using credentials (login, password)         │
└─────────────────────────────────────────────────────────────┘
```

## ✅ What's Installed:

1. ✅ **MT5 Terminal**: `/root/imperial-factory/mt5-master/terminal64.exe` (127MB)
2. ✅ **Broker Service**: `imperial-broker-service` (Node.js, running on PM2)
3. ✅ **Python Scripts**: Located in `broker-service/python/`
4. ✅ **MetaTrader5 Library**: Installed in Wine Python (version 5.0.5488)
5. ✅ **Visual C++ Runtime**: Installed (needed for MetaTrader5 library)

## ⚠️ Important Note:

The **MetaTrader5 Python library** connects to the **MT5 terminal** via **IPC (Inter-Process Communication)**. This means:

- ✅ The Python library is installed and working
- ✅ The MT5 terminal file exists
- ⚠️ **BUT**: The MT5 terminal process must be **RUNNING** for the Python library to connect to it

The Python library **cannot start** the MT5 terminal automatically - it can only **connect** to an already-running MT5 process.

## 🔧 To Make Credentials Connect:

The MT5 terminal needs to be started first. Options:

1. **Start MT5 manually** (for testing)
2. **Auto-start MT5** when broker service starts
3. **Run MT5 as a service** (always running)

Once MT5 is running, the credentials will connect successfully!
