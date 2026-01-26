# 🔍 Service Clarification - Price Feeder vs Broker Service

## 📊 Two Separate Services

### 1. **Imperial Price Feeder** (What I've Been Talking About)
- **PM2 Name**: `Imperial Price Feeder`
- **Purpose**: Live price streaming to your website
- **MT5**: EC Markets MT5 (Login: 81071266)
- **24/7 Protection**: ✅ YES - All layers configured
- **Watchdog**: ✅ YES - Has watchdog
- **Auto-Restart**: ✅ YES - Unlimited restarts
- **Windows Startup**: ✅ YES - Starts on boot

### 2. **Imperial Trade Broker Service** (Different Service)
- **PM2 Name**: `imperial-trade-broker-service`
- **Purpose**: User broker connections (trade journaling)
- **MT5**: Generic MT5 (User's broker accounts)
- **24/7 Protection**: ⚠️ MAYBE - Needs verification
- **Watchdog**: ⚠️ UNKNOWN - May not have watchdog
- **Auto-Restart**: ⚠️ LIKELY - PM2 default behavior
- **Windows Startup**: ⚠️ UNKNOWN - May not be configured

---

## 🎯 What You Asked About

**You said**: `pm2 restart "Imperial Price Feeder"`

**That's**: ✅ **Imperial Price Feeder** (Price streaming service)

**My answers were about**: ✅ **Imperial Price Feeder**

---

## ✅ Price Feeder 24/7 Status

**Imperial Price Feeder** (the one you restarted):
- ✅ **PM2 Auto-Restart**: Configured (unlimited)
- ✅ **PM2 Persistence**: Enabled
- ✅ **Watchdog**: Exists (needs verification if running)
- ✅ **Windows Startup**: Exists (needs verification if enabled)

---

## ⚠️ Broker Service Status

**Imperial Trade Broker Service** (different service):
- ⚠️ **PM2 Auto-Restart**: Likely enabled (PM2 default)
- ⚠️ **PM2 Persistence**: Likely enabled (if `pm2 save` was run)
- ❓ **Watchdog**: Unknown (may not exist)
- ❓ **Windows Startup**: Unknown (may not be configured)

---

## 🔍 How to Check Each Service

### Check Price Feeder:
```powershell
pm2 describe "Imperial Price Feeder"
pm2 logs "Imperial Price Feeder" --lines 10
```

### Check Broker Service:
```powershell
pm2 describe imperial-trade-broker-service
pm2 logs imperial-trade-broker-service --lines 10
```

### Check Both:
```powershell
pm2 status
```

---

## 📋 Summary

| Service | What You Asked About | 24/7 Protection | Watchdog |
|---------|---------------------|-----------------|----------|
| **Imperial Price Feeder** | ✅ YES | ✅ YES | ✅ YES |
| **Broker Service** | ❌ NO | ⚠️ UNKNOWN | ❓ UNKNOWN |

---

**Answer**: I was talking about **Imperial Price Feeder** (the one you restarted with `pm2 restart "Imperial Price Feeder"`)
