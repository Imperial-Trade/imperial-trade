# Go Brain and Python Worker Interaction Logs

## Architecture Overview:

### 1. **Go Brain (Manager)** - systemd service
- **Location**: `/root/imperial-factory/brain/imperial-brain`
- **Role**: Orchestrator - watches Supabase, manages Docker containers
- **Why Go**: Fast concurrency, Docker API integration

### 2. **Python Worker (Translator)** - Inside Docker containers
- **Location**: Python scripts in containers
- **Role**: MT5 API bridge - logs into broker, fetches trades
- **Why Python**: Official MT5 API only exists for Python

### 3. **Node.js Service (Front Door)** - PM2
- **Location**: Port 3001
- **Role**: Web API - receives requests from frontend
- **Why Node.js**: Web API, spawns Python scripts

### 4. **PM2 (Guard)** - Process Manager
- **Role**: Keeps services alive 24/7, auto-restart on crash

## Workflow:
```
Supabase (Database)
  ↓
Go Brain (Go) - Sees credentials, spins up Docker container
  ↓
Python Script (in container) - Uses MT5 library to talk to broker
  ↓
Python sends trades back to Supabase
  ↓
PM2 ensures everything stays running
```

## IPC Timeout Fixes Applied:
1. ✅ Clean slate command (kill all Wine processes)
2. ✅ Check terminal architecture (64-bit)
3. ✅ Install Wine dependencies (FreeType, GnuTLS)
4. ✅ Update Python scripts for portable mode (`portable=True`)
5. ✅ Launch MT5 manually with `/portable` flag
6. ✅ Test Python script with MT5 already running
