# PM2 Restart and Error Fix

## Current Status:

### PM2 Service:
- ✅ `imperial-broker-service` is running (Node.js)
- ✅ Service restarted successfully
- ⚠️  Redis connection errors (non-critical - service falls back to direct processing)

### Errors Found:
1. **Redis Connection Error** (ECONNREFUSED ::1:6379)
   - Service tries to use Redis for queue management
   - Redis is not installed/running
   - Service automatically falls back to direct processing (working)

2. **Python Script Hanging**
   - MT5 initialization hangs (Wine IPC issue)
   - Not a PM2 issue - it's a Wine/MT5 compatibility problem

### Go Language Service:
- ❌ **No Go service is running**
- Go Brain code exists but is NOT deployed
- Current system uses Node.js service only

## What Needs to be Fixed:

1. Redis errors (optional - can disable Redis fallback)
2. MT5 connection (Wine IPC issue - separate problem)
