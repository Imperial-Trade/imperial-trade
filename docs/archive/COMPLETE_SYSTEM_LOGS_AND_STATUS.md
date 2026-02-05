# Complete System Logs and Status

## System Architecture:

### 1. **Go Brain (Manager)** - systemd service
- **Status**: ✅ ACTIVE
- **Location**: `/root/imperial-factory/brain/imperial-brain`
- **Role**: Orchestrator - watches Supabase, manages Docker containers
- **Logs**: `journalctl -u imperial-brain.service`

### 2. **Python Worker (Translator)** - Inside Docker containers
- **Status**: Runs inside containers launched by Go Brain
- **Role**: MT5 API bridge - logs into broker, fetches trades
- **Logs**: Docker container logs

### 3. **Node.js Service (Front Door)** - PM2
- **Status**: ✅ ONLINE (Port 3001)
- **Role**: Web API - receives requests from frontend
- **Logs**: `pm2 logs imperial-broker-service`

### 4. **MT5 Terminal** - Running with /portable flag
- **Status**: ✅ RUNNING (PID 85109)
- **Command**: `xvfb-run -a wine64 'C:\\imperial-factory\\mt5-master\\terminal64.exe' /portable`

## Go Brain Activity Logs:

### Recent Container Launches:
- **Jan 12 21:58:49**: ⚡ Fast Sync Started for Login: 81071266 (Container: 17d51cffa68b)
- **Jan 12 22:00:19**: 🛑 Stopping container 17d51cffa68b
- **Jan 12 22:00:30**: ✅ Container removed: 17d51cffa68b

### Pattern:
1. Go Brain queries `next_sync_task` view every 5 seconds
2. Finds connections ready to sync
3. Launches Docker container with credentials
4. Container runs for 90 seconds (auto-sync)
5. Go Brain stops and removes container

## IPC Timeout Fixes Applied:

1. ✅ **Clean Slate**: Kill all Wine processes before test
2. ✅ **Wine Dependencies**: FreeType and GnuTLS installed
3. ✅ **Portable Mode**: Updated Python scripts to use `portable=True`
4. ✅ **Windows Paths**: Using `C:\\imperial-factory\\mt5-master\\terminal64.exe`
5. ✅ **60s Timeout**: Increased from 20s to 60s
6. ✅ **MT5 Running**: MT5 terminal launched manually with `/portable` flag

## Current Status:
- ✅ Go Brain: Active and managing containers
- ✅ Node.js Service: Online (PM2)
- ✅ MT5 Terminal: Running with /portable flag
- ✅ Python Scripts: Updated with portable mode
- ⏳ Testing connection with MT5 already running
