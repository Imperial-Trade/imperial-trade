# Deploy and Verify Broker Service

## 🚀 Quick Deployment Guide

### Step 1: Run Safe Deployment Script

**On Windows VPS**:
```powershell
# Navigate to project directory
cd C:\vps-broker-service

# Run safe deployment script (protects Price Feeder)
.\vps-setup\SAFE_DEPLOY_BROKER_SERVICE.ps1
```

**What this script does**:
- ✅ Verifies Price Feeder is running
- ✅ Installs Redis (if needed)
- ✅ Builds broker service
- ✅ Restarts ONLY broker service (Price Feeder protected)
- ✅ Verifies both services are running
- ✅ Tests health endpoints

---

## ✅ Verification Checklist

### 1. Verify Services are Running

```powershell
pm2 list
```

**Expected Output**:
```
┌─────┬──────────────────────────────┬─────────┬─────────┬──────────┐
│ id  │ name                         │ status  │ restart │ uptime   │
├─────┼──────────────────────────────┼─────────┼─────────┼──────────┤
│ 0   │ Imperial Price Feeder        │ online  │ 0       │ 2h 30m   │
│ 1   │ imperial-trade-broker-service│ online  │ 0       │ 0m 5s    │
└─────┴──────────────────────────────┴─────────┴─────────┴──────────┘
```

**Both services should be "online"**

---

### 2. Test Broker Service Health

```powershell
$apiKey = "bfa602cd4a12c93cd6a0f6cab9d93ff7b0fcd4dd2392f94e48db2013d679990d"
Invoke-WebRequest -Uri "http://localhost:3001/health" -Headers @{"X-API-Key"=$apiKey}
```

**Expected Response**:
```json
{
  "status": "ok",
  "service": "imperial-trade-broker-service",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "uptime": 123.45
}
```

---

### 3. Test Terminal Statistics

```powershell
Invoke-WebRequest -Uri "http://localhost:3001/terminals/stats" -Headers @{"X-API-Key"=$apiKey}
```

**Expected Response**:
```json
{
  "total": 50,
  "available": 50,
  "busy": 0,
  "terminals": [...]
}
```

**Note**: If Redis is not running, this endpoint may fail. That's OK - the service will still work but queue system won't be active.

---

### 4. Verify Price Feeder is Still Running

```powershell
# Check Price Feeder logs
pm2 logs "Imperial Price Feeder" --lines 10

# Should see recent price updates
```

**Expected**: Recent log entries showing price updates

---

### 5. Test Frontend Connection

1. **Start Frontend** (on your local machine):
   ```bash
   npm run dev
   ```

2. **Navigate to Journal XX Pro**:
   - URL: `http://localhost:5173/dashboard/journal-xx-pro`
   - Or: `http://localhost:8081/dashboard/journal-xx-pro`

3. **Test Connection**:
   - Select "EC Markets"
   - Enter credentials:
     - Login: `800107112`
     - Password: `Demo@123`
     - Server: `ECMarketsLtd-Demo`
   - Click "Connect Broker"

4. **Monitor**:
   - Browser Console (F12)
   - Network Tab (F12 → Network)
   - Status messages in UI

**Expected Flow**:
1. ✅ "Testing connection..." (5-10 seconds)
2. ✅ "Saving connection..."
3. ✅ "Fetching trade history..." (10-20 seconds)
4. ✅ "Connected successfully!"
5. ✅ Trades appear in journal

---

## 🐛 Troubleshooting

### Issue: "Price Feeder stopped"

**Solution**:
```powershell
# Restart Price Feeder immediately
pm2 restart "Imperial Price Feeder"

# Verify it's running
pm2 list
```

### Issue: "Broker service not starting"

**Check logs**:
```powershell
pm2 logs imperial-trade-broker-service --lines 50
```

**Common causes**:
- Missing dependencies: `npm install`
- Build errors: `npm run build`
- Port 3001 already in use
- Missing environment variables

### Issue: "Redis connection failed"

**Solution**:
1. Start Redis:
   ```powershell
   # Option A: Direct
   C:\Redis\redis-server.exe
   
   # Option B: Docker
   docker start redis
   ```

2. Verify Redis is running:
   ```powershell
   Get-Process -Name "redis-server"
   ```

3. Test connection:
   ```powershell
   redis-cli ping
   # Should return: PONG
   ```

**Note**: Service will work without Redis, but queue system won't be active.

### Issue: "No available terminals"

**Solution**:
1. Check terminal stats: `GET /terminals/stats`
2. Wait 5-10 seconds for terminals to become available
3. Increase `MT5_MAX_TERMINALS` in `.env` if needed

---

## 📊 Monitoring

### Check Service Logs

```powershell
# Broker service logs
pm2 logs imperial-trade-broker-service

# Price Feeder logs
pm2 logs "Imperial Price Feeder"

# Both services
pm2 logs
```

### Monitor Queue Status

```powershell
# If Redis is running
redis-cli
> KEYS *
> LLEN bull:mt5-connection-test:waiting
> LLEN bull:mt5-connection-test:active
> LLEN bull:mt5-connection-test:completed
```

### Check Service Status

```powershell
# PM2 status
pm2 status

# Detailed info
pm2 show imperial-trade-broker-service
pm2 show "Imperial Price Feeder"
```

---

## ✅ Success Criteria

- [ ] Both services running in PM2
- [ ] Health endpoint returns 200
- [ ] Terminal stats endpoint works (or shows Redis error)
- [ ] Price Feeder still running and updating prices
- [ ] Frontend can connect to broker
- [ ] Connection test succeeds
- [ ] Trades are fetched and displayed

---

## 🔒 Price Feeder Protection

**Guarantees**:
- ✅ Price Feeder is never stopped during deployment
- ✅ Price Feeder is automatically restarted if it stops
- ✅ Live price feeds continue uninterrupted
- ✅ Only broker service is restarted

**Verification**:
```powershell
# Before deployment
pm2 list | Select-String "Imperial Price Feeder"

# After deployment
pm2 list | Select-String "Imperial Price Feeder"

# Both should show "online"
```

---

## 📝 Next Steps

1. **Test Connection**: Use frontend to connect to MT5
2. **Monitor Performance**: Watch logs for any errors
3. **Scale if Needed**: Increase `MT5_MAX_TERMINALS` for more capacity
4. **Install Redis**: For full queue system functionality

---

**Status**: ✅ **READY FOR DEPLOYMENT**

Run `SAFE_DEPLOY_BROKER_SERVICE.ps1` on your VPS to deploy safely.
