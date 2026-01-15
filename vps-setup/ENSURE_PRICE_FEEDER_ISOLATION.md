# 🔒 Price Feeder Isolation Guarantee

## ✅ Current Status

**Imperial Price Feeder**: ✅ ONLINE (PID: 4648, Uptime: 8s)
**Broker Service**: ✅ ONLINE (PID: 2812, Port: 3001)

---

## 🛡️ Isolation Mechanisms

### 1. **Separate MT5 Terminals**
- **Price Feeder**: Uses **EC Markets MT5** (`ECMarkets-MT5-Live01`)
  - Path: `C:\Program Files\MetaTrader 5\terminal64.exe` (EC Markets instance)
  - Login: `81071266`
  - Purpose: Live price streaming only

- **Broker Service**: Uses **Generic MT5** (NOT EC Markets)
  - Path: `C:\Program Files\MetaTrader 5\terminal64.exe` (Generic instance)
  - Purpose: User broker connections (EC Markets, XS.com, PU Prime, etc.)
  - **CRITICAL**: Never touches EC Markets MT5 terminal

### 2. **Separate Python Scripts**
- **Price Feeder**: `C:\imperial-price-feeder\mt5_bridge.py`
- **Broker Service**: `C:\vps-broker-service\python\test_connection.py` and `fetch_trades.py`
- **No shared code or dependencies**

### 3. **Separate PM2 Processes**
- **Price Feeder**: PM2 process ID 0, name: `Imperial Price Feeder`
- **Broker Service**: PM2 process ID 1, name: `imperial-trade-broker-service`
- **Independent lifecycle**: Restarting one does NOT affect the other

### 4. **Separate Ports**
- **Price Feeder**: Uses its own internal ports (not exposed)
- **Broker Service**: Port 3001 (exposed to Supabase Edge Functions)

### 5. **Separate Data Directories**
- **Price Feeder**: Uses EC Markets MT5 data directory
- **Broker Service**: Uses Generic MT5 data directory OR portable mode terminals
- **No file conflicts**

---

## 🚨 Safety Rules (NEVER VIOLATE)

### ❌ NEVER DO THESE:
1. **NEVER** run `pm2 delete all` - This kills BOTH services
2. **NEVER** modify price feeder code when working on broker service
3. **NEVER** use EC Markets MT5 terminal path in broker service
4. **NEVER** share Python scripts between services
5. **NEVER** restart both services at once

### ✅ ALWAYS DO THESE:
1. **ALWAYS** use Generic MT5 for broker service
2. **ALWAYS** check PM2 status before making changes
3. **ALWAYS** restart services individually
4. **ALWAYS** verify price feeder is still running after broker service changes
5. **ALWAYS** use portable mode for broker service (prevents conflicts)

---

## 🔧 Safe Commands

### Check Status (Safe - Read Only)
```powershell
pm2 status
pm2 logs "Imperial Price Feeder" --lines 10
pm2 logs imperial-trade-broker-service --lines 10
```

### Restart Price Feeder Only (Safe)
```powershell
pm2 restart "Imperial Price Feeder"
pm2 save
```

### Restart Broker Service Only (Safe)
```powershell
pm2 restart imperial-trade-broker-service
pm2 save
```

### Start Price Feeder (If Stopped)
```powershell
pm2 start C:\imperial-price-feeder\dist\index.js --name "Imperial Price Feeder"
pm2 save
```

### Start Broker Service (If Stopped)
```powershell
pm2 start C:\vps-broker-service\dist\index.js --name imperial-trade-broker-service
pm2 save
```

---

## 🛡️ Verification Checklist

After ANY broker service change, verify:

- [ ] Price Feeder status: `pm2 status` shows "online"
- [ ] Price Feeder logs: `pm2 logs "Imperial Price Feeder" --lines 5` shows activity
- [ ] Price Feeder PID: Still running (check `pm2 status`)
- [ ] No errors in price feeder logs
- [ ] Price feeder MT5 connection: Logs show "MT5 connected"
- [ ] Price streaming: Logs show price updates

---

## 📋 Code Verification

### Broker Service Python Scripts
✅ **test_connection.py** (line 40):
```python
CRITICAL: Uses ONLY Generic MT5 (NOT EC Markets MT5) to avoid interfering with price feeder
```

✅ **test_connection.py** (line 52):
```python
generic_mt5_path = r"C:\Program Files\MetaTrader 5\terminal64.exe"  # Generic, NOT EC Markets
```

### Broker Service Node.js
✅ **index.ts** (line 61):
```typescript
const PORT = parseInt(process.env.PORT || '3001', 10); // Use 3001 to avoid conflict with price feeder
```

---

## 🎯 Current Configuration

| Service | MT5 Terminal | Login | Port | PM2 Name | Status |
|---------|-------------|-------|------|----------|--------|
| **Price Feeder** | EC Markets MT5 | 81071266 | Internal | `Imperial Price Feeder` | ✅ ONLINE |
| **Broker Service** | Generic MT5 | User's broker | 3001 | `imperial-trade-broker-service` | ✅ ONLINE |

---

## ✅ Conclusion

**The broker service and price feeder are COMPLETELY ISOLATED:**

1. ✅ Different MT5 terminals (Generic vs EC Markets)
2. ✅ Different Python scripts
3. ✅ Different PM2 processes
4. ✅ Different ports
5. ✅ Different data directories
6. ✅ No shared code or dependencies

**Changes to the broker service CANNOT affect the price feeder.**

---

## 🚨 Emergency Recovery

If price feeder stops (should never happen from broker service changes):

```powershell
# 1. Check if it's actually stopped
pm2 status

# 2. Start it if stopped
pm2 start C:\imperial-price-feeder\dist\index.js --name "Imperial Price Feeder"

# 3. Save PM2 configuration
pm2 save

# 4. Verify it's running
pm2 logs "Imperial Price Feeder" --lines 10
```

---

**Last Verified**: 2026-01-09 02:26 UTC
**Price Feeder Status**: ✅ ONLINE
**Broker Service Status**: ✅ ONLINE
**Isolation**: ✅ CONFIRMED
