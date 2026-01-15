# MT5 and Broker Service Connection Explained

## Architecture Overview

### 1. **MT5 Terminal Installation**
- **Location**: `/root/imperial-factory/mt5-master/terminal64.exe`
- **Purpose**: MetaTrader 5 terminal executable (runs in Wine)

### 2. **Broker Service (Node.js)**
- **Service Name**: `imperial-broker-service`
- **Location**: `/root/imperial-factory/broker-service`
- **Purpose**: HTTP API that receives requests from Supabase Edge Functions

### 3. **Python Scripts**
- **Location**: `/root/imperial-factory/broker-service/python/`
- **Scripts**: `test_connection.py`, `fetch_trades.py`
- **Purpose**: Use MetaTrader5 Python library to connect to MT5 terminal

## How They Connect:

```
Supabase Edge Function
    ↓
    HTTP Request to VPS
    ↓
imperial-broker-service (Node.js on PM2)
    ↓
    Spawns Python process
    ↓
Python Script (test_connection.py / fetch_trades.py)
    ↓
    Uses MetaTrader5 Python library
    ↓
MetaTrader5 Library connects to MT5 Terminal
    ↓
/root/imperial-factory/mt5-master/terminal64.exe
```

## Key Points:

1. **MT5 Terminal** is installed separately from the broker service
2. **Broker Service** is a Node.js HTTP server (runs on port 3001)
3. **Python Scripts** bridge Node.js and MT5 using the MetaTrader5 library
4. **MetaTrader5 Library** (installed in Wine Python) connects to the MT5 terminal
