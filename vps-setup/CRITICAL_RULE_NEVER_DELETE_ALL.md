# 🚨 CRITICAL RULE - NEVER DELETE ALL PM2 SERVICES

## ⚠️ PERMANENT RULE - DO NOT VIOLATE

**NEVER use `pm2 delete all` or `pm2 stop all` when working on broker service**

This will stop BOTH:
- ❌ Imperial Price Feeder (MUST stay running)
- ❌ Broker Service

## ✅ ALWAYS USE THESE COMMANDS

### For Broker Service Only:
```powershell
pm2 restart imperial-trade-broker-service
```

### For Price Feeder Only:
```powershell
pm2 restart "Imperial Price Feeder"
```

## ❌ NEVER USE:
```powershell
pm2 delete all      # ❌ NEVER
pm2 stop all        # ❌ NEVER
pm2 restart all     # ❌ AVOID (use specific service names)
```

## 🔒 PROTECTION CHECKLIST

Before ANY PM2 command:
1. Does it say "all"? → **STOP, use specific service name**
2. Does it say "delete"? → **STOP, use "restart" instead**
3. Am I targeting the correct service? → **Verify: `imperial-trade-broker-service`**
4. Will Price Feeder be affected? → **If yes, DON'T DO IT**

## 📋 Service Names (Reference)
- Broker Service: `imperial-trade-broker-service`
- Price Feeder: `Imperial Price Feeder` (with spaces)

## ✅ Safe Scripts Available
- `RESTART_BROKER_SERVICE_ONLY.ps1` - Only touches broker service
- `ENSURE_PRICE_FEEDER_NEVER_STOPS.ps1` - Only touches price feeder

## 🎯 COMMITMENT
**I will ALWAYS use specific service names and NEVER use `pm2 delete all`**

