# 🔍 MT5 Terminal Architecture Explanation

## Question: Do Generic MT5 and EC Markets MT5 use the same `terminal64.exe`?

### ✅ **Answer: YES - They use the SAME executable**

Both Generic MT5 and EC Markets MT5 use the **same** `terminal64.exe` executable located at:
```
C:\Program Files\MetaTrader 5\terminal64.exe
```

---

## 🏗️ How MT5 Architecture Works

### **Single Executable, Multiple Broker Configurations**

MT5 uses a **single executable** (`terminal64.exe`) but supports **multiple broker configurations** through:

1. **Data Directories**: Each broker has its own data directory
   - Location: `C:\Users\[Username]\AppData\Roaming\MetaQuotes\Terminal\[BrokerID]\`
   - Each broker gets a unique ID (hash)
   - Separate account databases, settings, and history

2. **Server-Based Connection**: The Python MT5 library connects to specific brokers via:
   - **Server name** (e.g., `ECMarkets-MT5-Live01`)
   - **Login credentials** (account number and password)
   - The same executable handles all broker connections

3. **Process Isolation**: When MT5 is running:
   - One `terminal64.exe` process can handle multiple broker connections
   - Each connection uses different server/login credentials
   - Data is stored in separate directories

---

## 🔍 Current Setup Analysis

### **Price Feeder (EC Markets MT5)**
- **Executable**: `C:\Program Files\MetaTrader 5\terminal64.exe` (same as Generic)
- **Server**: `ECMarkets-MT5-Live01`
- **Login**: `81071266`
- **Data Directory**: `C:\Users\Administrator\AppData\Roaming\MetaQuotes\Terminal\[ECMarketsID]\`
- **Python Connection**: Uses `mt5.initialize()` with server/login credentials

### **Broker Service (Generic MT5)**
- **Executable**: `C:\Program Files\MetaTrader 5\terminal64.exe` (same as EC Markets)
- **Server**: User's broker server (varies: EC Markets, XS.com, PU Prime, etc.)
- **Login**: User's broker account (varies)
- **Data Directory**: `C:\Users\Administrator\AppData\Roaming\MetaQuotes\Terminal\[GenericID]\`
- **Python Connection**: Uses `mt5.initialize()` with user's server/login credentials

---

## 🛡️ How Isolation Works (Despite Same Executable)

### **1. Server-Based Isolation** ✅
- **Price Feeder**: Always connects to `ECMarkets-MT5-Live01` with login `81071266`
- **Broker Service**: Connects to user's broker server with user's login
- **Result**: Different broker connections = No interference

### **2. Data Directory Isolation** ✅
- **Price Feeder**: Uses EC Markets data directory
- **Broker Service**: Uses Generic MT5 data directory
- **Result**: Separate account databases = No data conflicts

### **3. Connection Timing** ✅
- **Price Feeder**: Maintains persistent connection to EC Markets
- **Broker Service**: Creates temporary connections for user brokers
- **Result**: Different connection patterns = Minimal interference

### **4. Python API Isolation** ✅
- **Price Feeder**: Python script connects to EC Markets via `mt5.login(81071266, server="ECMarkets-MT5-Live01")`
- **Broker Service**: Python script connects to user's broker via `mt5.login(user_login, server=user_server)`
- **Result**: Different API calls = Separate connections

---

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    WINDOWS VPS                              │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  MT5 Executable (Single Instance)                   │  │
│  │  C:\Program Files\MetaTrader 5\terminal64.exe       │  │
│  └──────────────────────────────────────────────────────┘  │
│           │                    │                            │
│           │                    │                            │
│  ┌────────▼────────┐  ┌────────▼────────┐                 │
│  │  EC Markets     │  │  Generic MT5    │                 │
│  │  Connection     │  │  Connection     │                 │
│  │                 │  │                 │                 │
│  │  Server: ECMarkets-│  │  Server: User's │                 │
│  │         MT5-Live01│  │         Broker  │                 │
│  │  Login: 81071266│  │  Login: User's  │                 │
│  │                 │  │                 │                 │
│  │  Data Dir:      │  │  Data Dir:      │                 │
│  │  [ECMarketsID]  │  │  [GenericID]    │                 │
│  └─────────────────┘  └─────────────────┘                 │
│           │                    │                            │
│           │                    │                            │
│  ┌────────▼────────┐  ┌────────▼────────┐                 │
│  │  Price Feeder   │  │  Broker Service │                 │
│  │  (Python API)   │  │  (Python API)   │                 │
│  └─────────────────┘  └─────────────────┘                 │
│                                                              │
│  ✅ Same executable, different connections = Isolation      │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ Why This Works

### **1. MT5 Supports Multiple Connections**
- MT5 can handle multiple broker connections simultaneously
- Each connection uses different server/login credentials
- Data is stored in separate directories

### **2. Python MT5 Library Isolation**
- Each Python script creates its own MT5 connection
- Connections are identified by server/login combination
- No interference between different connections

### **3. Data Directory Separation**
- EC Markets data: `[ECMarketsID]` directory
- Generic MT5 data: `[GenericID]` directory
- Separate account databases prevent conflicts

---

## 🚨 Important Notes

1. **Same Executable**: Both use `C:\Program Files\MetaTrader 5\terminal64.exe`
2. **Different Connections**: Isolation is achieved through different server/login combinations
3. **Data Separation**: Each broker uses its own data directory
4. **No Conflicts**: MT5 handles multiple connections gracefully
5. **Python API**: Each Python script creates independent connections

---

## 🔍 Verification

### Check MT5 Executable
```powershell
Get-Process terminal64 | Select-Object Path
```

**Expected**: All processes show `C:\Program Files\MetaTrader 5\terminal64.exe`

### Check Data Directories
```powershell
Get-ChildItem "C:\Users\Administrator\AppData\Roaming\MetaQuotes\Terminal"
```

**Expected**: Multiple directories (one for each broker configuration)

### Check Python Connections
```powershell
# Price Feeder connects to EC Markets
# Broker Service connects to user's broker
# Both use same executable, different server/login
```

---

## ✅ Conclusion

**Yes, both Generic MT5 and EC Markets MT5 use the same `terminal64.exe` executable.**

**Isolation is achieved through:**
- ✅ Different server/login credentials
- ✅ Separate data directories
- ✅ Independent Python API connections
- ✅ MT5's built-in multi-connection support

**This is the standard MT5 architecture and works perfectly for our use case.**

---

**Last Updated**: 2026-01-09 02:59 UTC
**Status**: ✅ **ARCHITECTURE CONFIRMED**
