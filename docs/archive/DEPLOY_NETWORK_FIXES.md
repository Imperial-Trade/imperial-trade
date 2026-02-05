# 🔧 Deploy Network Connection Fixes to VPS

## Summary of Fixes

1. **Express Server Binding**: Changed from `localhost` to `0.0.0.0` to accept external connections
2. **CORS Configuration**: Enhanced CORS to allow Edge Function calls from Supabase
3. **Windows Firewall**: Script to configure firewall rules for port 3001

## Files Changed

- `vps-broker-service/src/index.ts`:
  - Changed `app.listen(PORT, ...)` to `app.listen(PORT, '0.0.0.0', ...)`
  - Enhanced CORS configuration

- `vps-broker-service/fix-network-connection.ps1`:
  - New script to configure Windows Firewall
  - Rebuilds and restarts the service

## Deployment Steps (Run on VPS)

### Option 1: Using the PowerShell Script (Recommended)

```powershell
# 1. Copy the fixed index.ts to VPS (or pull from git if available)
# 2. Run the fix script
cd C:\vps-broker-service
powershell -ExecutionPolicy Bypass -File .\fix-network-connection.ps1
```

### Option 2: Manual Steps

```powershell
# 1. Navigate to service directory
cd C:\vps-broker-service

# 2. Rebuild TypeScript
npm run build

# 3. Configure Windows Firewall
New-NetFirewallRule -DisplayName "JournalAPI-Port3001" `
    -Direction Inbound `
    -Protocol TCP `
    -LocalPort 3001 `
    -Action Allow `
    -Description "Allow Imperial Trade Broker Service on port 3001"

# 4. Restart PM2 service
pm2 stop imperial-trade-broker-service
pm2 delete imperial-trade-broker-service
pm2 start "C:\vps-broker-service\dist\index.js" `
    --name imperial-trade-broker-service `
    --cwd "C:\vps-broker-service"
pm2 save

# 5. Test local connectivity
curl http://localhost:3001/health

# 6. Check logs
pm2 logs imperial-trade-broker-service --lines 50
```

### Option 3: Quick Fix (If files already updated)

```powershell
cd C:\vps-broker-service

# Edit src/index.ts manually to change:
# OLD: app.listen(PORT, () => {
# NEW: app.listen(PORT, '0.0.0.0', () => {

# Rebuild and restart
npm run build
pm2 restart imperial-trade-broker-service

# Configure firewall
New-NetFirewallRule -DisplayName "JournalAPI-Port3001" -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow
```

## Testing

### Test 1: Local (on VPS)
```powershell
curl http://localhost:3001/health
# Should return: {"status":"ok","service":"imperial-trade-broker-service",...}
```

### Test 2: External (from your machine)
```bash
curl http://45.32.89.134:3001/health
# Should return the same JSON response
```

### Test 3: From Edge Function
The Edge Function should now be able to reach the VPS at `http://45.32.89.134:3001/test-connection`

## HTTPS/SSL Setup (Optional but Recommended)

If Edge Function still can't connect due to HTTPS/HTTP mixed content:

### Option A: ngrok (Quick Testing)
```powershell
# Install ngrok on VPS
# Then run:
ngrok http 3001
# Update VPS_MT5_SERVICE_URL in Supabase secrets to use ngrok URL
```

### Option B: nginx + Let's Encrypt (Production)
1. Install nginx on Windows VPS
2. Configure reverse proxy to forward HTTPS to localhost:3001
3. Set up Let's Encrypt SSL certificate
4. Update VPS_MT5_SERVICE_URL to use HTTPS URL

### Option C: Cloudflare Tunnel (Easiest)
1. Install cloudflared on VPS
2. Create tunnel pointing to localhost:3001
3. Get public HTTPS URL
4. Update VPS_MT5_SERVICE_URL in Supabase secrets

## Troubleshooting

### Still Can't Connect?

1. **Check Windows Firewall**:
   ```powershell
   Get-NetFirewallRule -DisplayName "JournalAPI-Port3001"
   ```

2. **Check if service is listening on 0.0.0.0**:
   ```powershell
   netstat -an | findstr "3001"
   # Should show: TCP    0.0.0.0:3001    0.0.0.0:0    LISTENING
   ```

3. **Check Vultr/AWS Firewall Rules**:
   - Log into your cloud provider dashboard
   - Ensure port 3001 is open in Security Groups/Firewall

4. **Check Edge Function Logs**:
   - Go to Supabase Dashboard → Edge Functions → test-broker-connection → Logs
   - Look for connection errors

5. **Test from Edge Function directly**:
   - Check if error is "Connection Refused" (firewall issue)
   - Check if error is "SSL/TLS" related (HTTPS/HTTP mixed content)







