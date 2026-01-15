# System Architecture and Logs - Complete Overview

## 🏗️ Architecture Breakdown:

### 1. **Go Brain (Manager)** - systemd service
**Location**: `/root/imperial-factory/brain/imperial-brain`  
**Status**: ✅ **ACTIVE** (running since Jan 12, 21:39:14 UTC)  
**Role**: Orchestrator - watches Supabase database, manages Docker containers  
**Why Go**: Fast concurrency, excellent Docker API integration

**Recent Activity**:
```
Jan 12 21:58:49: ⚡ Fast Sync Started for: Unknown (Login: 81071266, Container: 17d51cffa68b)
Jan 12 22:00:19: 🛑 Stopping container 17d51cffa68b
Jan 12 22:00:30: ✅ Container removed: 17d51cffa68b
```

**How It Works**:
- Polls `next_sync_task` view every 5 seconds
- Finds broker connections ready to sync
- Launches Docker containers with `imperial-worker` image
- Each container runs for 90 seconds (auto-sync)
- Auto-stops and removes containers after completion

---

### 2. **Python Worker (Translator)** - Inside Docker containers
**Location**: Python scripts inside containers launched by Go Brain  
**Status**: Runs inside Docker containers  
**Role**: MT5 API bridge - logs into broker, fetches trades, formats JSON  
**Why Python**: Official MetaTrader 5 API only exists for Python (no Go library)

**Scripts**:
- `test_connection.py` - Tests MT5 connection
- `fetch_trades.py` - Fetches trade history
- `get_servers.py` - Gets available MT5 servers

---

### 3. **Node.js Service (Front Door)** - PM2
**Location**: Port 3001 (`/root/imperial-factory/broker-service`)  
**Status**: ✅ **ONLINE** (PM2 managed)  
**Role**: Web API - receives requests from frontend/Edge Functions  
**Why Node.js**: Web API, spawns Python scripts, handles HTTP requests

**Endpoints**:
- `POST /test-connection` - Test MT5 credentials
- `POST /fetch-trades` - Fetch trade history
- `GET /health` - Health check

---

### 4. **PM2 (Guard)** - Process Manager
**Status**: ✅ **RUNNING**  
**Role**: Keeps services alive 24/7, auto-restart on crash  
**Why PM2**: Ensures services restart automatically if VPS reboots or crashes

---

## 🔄 Complete Workflow:

```
1. Frontend (MacBook)
   ↓
2. Supabase Edge Function (test-broker-connection)
   ↓
3. Node.js Service (Port 3001) - Receives request
   ↓
4. Python Script (test_connection.py) - Spawned by Node.js
   ↓
5. MT5 Terminal (Wine) - Connects to broker
   ↓
6. Response flows back: MT5 → Python → Node.js → Edge Function → Frontend
```

**OR (Go Brain Path)**:

```
1. Supabase Database (broker_connections table)
   ↓
2. Go Brain (systemd) - Polls every 5 seconds
   ↓
3. Docker Container - Launched with credentials
   ↓
4. Python Script (inside container) - Syncs trades
   ↓
5. Trades saved to Supabase
   ↓
6. Container auto-stopped after 90 seconds
```

---

## 📊 System Status:

### ✅ Services Running:
1. **Go Brain**: Active (systemd)
2. **Node.js Service**: Online (PM2, Port 3001)
3. **MT5 Terminal**: Running with `/portable` flag (PID 85109)
4. **PM2**: Managing Node.js service

### 📝 Recent Go Brain Activity:
- **Jan 12 21:58:49**: Launched container for account 81071266
- **Jan 12 22:00:19**: Stopped container (90 seconds elapsed)
- **Jan 12 22:00:30**: Container removed successfully

### 🔧 IPC Timeout Fixes Applied:
1. ✅ **Windows Paths**: `C:\\imperial-factory\\mt5-master\\terminal64.exe`
2. ✅ **Portable Mode**: `portable=True` in Python scripts
3. ✅ **60s Timeout**: Increased from 20s to 60s
4. ✅ **Wine Dependencies**: FreeType and GnuTLS installed
5. ✅ **MT5 Running**: Terminal launched with `/portable` flag
6. ✅ **Architecture**: 64-bit PE32+ executable (correct)

---

## 🎯 Why This Architecture Works:

- **Go Brain**: Manages Docker containers efficiently (concurrency)
- **Python**: Only language with official MT5 API
- **Node.js**: Web API layer, spawns Python scripts
- **PM2**: Ensures 24/7 uptime

**Everything is working exactly as designed for a professional-grade trading bot!**
