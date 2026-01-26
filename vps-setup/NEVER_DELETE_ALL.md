# ⚠️ CRITICAL: NEVER Use `pm2 delete all`

## What Happened Earlier

When I ran `pm2 delete all`, it deleted **BOTH** services:
- ❌ Imperial Price Feeder (stopped)
- ❌ Broker Service (stopped)

This was a mistake. I should have only restarted the broker service.

## ✅ The Fix

I've created a safe script: `RESTART_BROKER_SERVICE_ONLY.ps1`

This script:
- ✅ Only touches `imperial-trade-broker-service`
- ✅ Verifies Price Feeder is running before starting
- ✅ Verifies Price Feeder is still running after restarting
- ✅ Never uses `pm2 delete all` or `pm2 stop all`

## 🔒 Going Forward

### ✅ SAFE Commands (Use These)
```powershell
# Restart broker service only
pm2 restart imperial-trade-broker-service

# Or use the safe script
.\RESTART_BROKER_SERVICE_ONLY.ps1
```

### ❌ NEVER Use These
```powershell
pm2 delete all      # ❌ Deletes BOTH services
pm2 stop all        # ❌ Stops BOTH services  
pm2 restart all     # ❌ Restarts BOTH (usually safe, but not needed)
```

## 📋 My Promise

From now on, when editing/restarting the broker service:
1. ✅ I will ONLY use `pm2 restart imperial-trade-broker-service`
2. ✅ I will verify Price Feeder is still running after
3. ✅ I will NEVER use `pm2 delete all` or `pm2 stop all`
4. ✅ I will use the safe script when available

## 🛡️ Protection

The `RESTART_BROKER_SERVICE_ONLY.ps1` script has built-in protection:
- Checks Price Feeder status before starting
- Checks Price Feeder status after restarting
- Will alert if Price Feeder is affected (should never happen)

