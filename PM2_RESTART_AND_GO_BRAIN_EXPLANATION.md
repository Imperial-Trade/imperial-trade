# PM2 Restart and Go Brain Explanation

## ✅ PM2 Service Status:
- **Service**: `imperial-broker-service` (Node.js)
- **Status**: ✅ Running and restarted successfully
- **Location**: `/root/imperial-factory/broker-service`

## ✅ Go Brain Service Status:
- **Service**: `imperial-brain.service` (systemd)
- **Status**: ✅ **RUNNING** (active)
- **Process**: `/root/imperial-factory/brain/imperial-brain`
- **Location**: `/root/imperial-factory/brain/`

## What Go Brain Does:

Go Brain is a **Docker container orchestrator** that:
1. Queries Supabase database for broker connections ready to sync
2. Decrypts credentials using AES-256-GCM
3. Creates Docker containers with MT5 terminals
4. Launches containers with `imperial-worker` Docker image
5. Auto-kills containers after 90 seconds
6. Manages up to 25 concurrent containers

**Note**: Go Brain uses Docker containers, NOT the Wine/Python approach. It's a separate system for containerized MT5 sync.

## Errors Fixed:

### Redis Connection Errors:
- **Status**: ✅ Fixed (made silent)
- **Issue**: Service was trying to connect to Redis (port 6379) but Redis is not installed
- **Fix**: Added error suppression for Redis connection errors (Redis is optional)
- **Result**: Service falls back to direct processing (working correctly)

## Current Architecture:

1. **Node.js Service** (PM2): Handles API requests, spawns Python scripts
2. **Go Brain** (systemd): Manages Docker containers for MT5 sync
3. **Python Scripts**: Called by Node.js service to connect to MT5 via Wine

## Services Running:
- ✅ Node.js broker service (PM2)
- ✅ Go Brain orchestrator (systemd)
- ✅ MT5 terminal (running)
