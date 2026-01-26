# 🔧 Complete Network Connection Fix Guide

## Problem Summary

The Edge Function cannot connect to the VPS because:
1. ❌ Express server is listening on `localhost` instead of `0.0.0.0`
2. ❌ Windows Firewall is blocking port 3001
3. ⚠️  Potential HTTPS/HTTP mixed content issues (Edge Functions run on HTTPS, VPS is HTTP)

## ✅ Fixes Applied (Local)

1. **Express Server**: Changed to listen on `0.0.0.0`
2. **CORS**: Enhanced to allow all origins for Edge Function calls
3. **Firewall Script**: Created PowerShell script to configure Windows Firewall

## 📋 Step-by-Step Deployment (Run on VPS)

### Option 1: Use the Automated Script (Recommended)

1. **Copy the fixed files to VPS:**
   ```powershell
   # On your local machine, copy these files to VPS:
   # - vps-broker-service/src/index.ts (fixed version)
   # - vps-broker-service/apply-network-fixes.ps1
   ```

2. **Run the fix script on VPS:**
   ```powershell
   cd C:\vps-broker-service
   powershell -ExecutionPolicy Bypass -File .\apply-network-fixes.ps1
   ```

### Option 2: Manual Fix (If script doesn't work)

#### Step 1: Fix the Express Server Binding

Edit `C:\vps-broker-service\src\index.ts`:

**Find this line (around line 281):**
```typescript
app.listen(PORT, () => {
```

**Change it to:**
```typescript
app.listen(PORT, '0.0.0.0', () => {
```

**Also update the console.log (around line 282):**
```typescript
console.log(`🚀 Imperial Trade Broker Service running on 0.0.0.0:${PORT}`);
```

#### Step 2: Rebuild the Service

```powershell
cd C:\vps-broker-service
npm run build
```

#### Step 3: Configure Windows Firewall

```powershell
# Run PowerShell as Administrator
New-NetFirewallRule -DisplayName "JournalAPI-Port3001" `
    -Direction Inbound `
    -Protocol TCP `
    -LocalPort 3001 `
    -Action Allow `
    -Description "Allow Imperial Trade Broker Service on port 3001"

# Verify the rule was created
Get-NetFirewallRule -DisplayName "JournalAPI-Port3001"
```

#### Step 4: Restart PM2 Service

```powershell
cd C:\vps-broker-service

# Stop and delete existing service
pm2 stop imperial-trade-broker-service
pm2 delete imperial-trade-broker-service

# Start service with updated code
pm2 start "dist\index.js" `
    --name imperial-trade-broker-service `
    --cwd "C:\vps-broker-service"

# Save PM2 configuration
pm2 save

# Check status
pm2 status
pm2 logs imperial-trade-broker-service --lines 20
```

#### Step 5: Verify Service is Listening on 0.0.0.0

```powershell
# Check listening ports
netstat -an | findstr "3001"

# Should show: TCP    0.0.0.0:3001    0.0.0.0:0    LISTENING
# NOT: TCP    127.0.0.1:3001    0.0.0.0:0    LISTENING
```

#### Step 6: Test Local Connectivity

```powershell
# Test from VPS itself
curl http://localhost:3001/health

# Should return JSON: {"status":"ok","service":"imperial-trade-broker-service",...}
```

#### Step 7: Get VPS External IP

```powershell
# Get your VPS external IP
Invoke-WebRequest -Uri "https://api.ipify.org" -UseBasicParsing

# Note this IP - you'll need it for testing
```

#### Step 8: Test External Connectivity

From your local machine or another network:

```bash
# Replace with your actual VPS IP
curl http://45.32.89.134:3001/health

# Should return the same JSON response
```

#### Step 9: Update Supabase Secrets (If IP Changed)

If your VPS IP changed, update in Supabase Dashboard:
1. Go to: Settings → Vault → Secrets
2. Update `VPS_MT5_SERVICE_URL` to: `http://YOUR_VPS_IP:3001`

#### Step 10: Check Vultr/AWS Firewall Rules

1. Log into Vultr (or your cloud provider) dashboard
2. Go to: Server → Firewall → Inbound Rules
3. Ensure TCP port 3001 is allowed from `0.0.0.0/0` (all sources)
4. If rule doesn't exist, add it:
   - Protocol: TCP
   - Port: 3001
   - Source: 0.0.0.0/0 (or specific IPs for security)

## 🧪 Testing the Full Connection

### Test 1: From Edge Function Logs

1. Go to Supabase Dashboard → Edge Functions → test-broker-connection → Logs
2. Try connecting from the frontend
3. Check logs for:
   - ✅ Success: "Testing connection via VPS: http://..."
   - ❌ Error: "Connection Refused" = Firewall issue
   - ❌ Error: "Timeout" = Network routing issue
   - ❌ Error: "SSL/TLS" = HTTPS/HTTP mixed content issue

### Test 2: Direct VPS Test

```powershell
# On VPS, test the test-connection endpoint directly
$headers = @{
    "Content-Type" = "application/json"
    "X-API-Key" = "YOUR_VPS_API_KEY"
}

$body = @{
    broker_type = "ecmarkets"
    encrypted_login = "test_encrypted_login"
    encrypted_password = "test_encrypted_password"
    encrypted_server = "test_encrypted_server"
    user_id = "test_user_id"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3001/test-connection" `
    -Method POST `
    -Headers $headers `
    -Body $body `
    -UseBasicParsing
```

## 🔒 HTTPS/SSL Setup (If Still Having Issues)

If Edge Function still can't connect due to HTTPS/HTTP mixed content:

### Option A: ngrok (Quick Testing)

```powershell
# Install ngrok on VPS
# Download from: https://ngrok.com/download

# Run ngrok
ngrok http 3001

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# Update Supabase secret: VPS_MT5_SERVICE_URL = https://abc123.ngrok.io
```

### Option B: nginx + Let's Encrypt (Production)

1. Install nginx on Windows
2. Configure reverse proxy:
   ```nginx
   server {
       listen 443 ssl;
       server_name yourdomain.com;
       
       ssl_certificate /path/to/cert.pem;
       ssl_certificate_key /path/to/key.pem;
       
       location / {
           proxy_pass http://localhost:3001;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```
3. Set up Let's Encrypt certificate
4. Update `VPS_MT5_SERVICE_URL` to: `https://yourdomain.com`

### Option C: Cloudflare Tunnel (Easiest)

```powershell
# Install cloudflared
# Create tunnel
cloudflared tunnel create imperial-trade

# Run tunnel
cloudflared tunnel --url http://localhost:3001

# Update Supabase secret with the HTTPS URL provided
```

## 🔍 Troubleshooting Checklist

- [ ] Service is listening on `0.0.0.0:3001` (not `127.0.0.1:3001`)
- [ ] Windows Firewall rule exists and is enabled
- [ ] Vultr/AWS firewall allows port 3001
- [ ] Service is running (check `pm2 status`)
- [ ] Local health check works (`curl http://localhost:3001/health`)
- [ ] External health check works (`curl http://VPS_IP:3001/health`)
- [ ] Supabase secret `VPS_MT5_SERVICE_URL` is correct
- [ ] Supabase secret `VPS_API_KEY` matches VPS `.env` file
- [ ] Edge Function logs show connection attempt
- [ ] MT5 terminal is running on VPS
- [ ] MT5 has "Allow Algo Trading" enabled

## 📊 Verification Commands

```powershell
# 1. Check if service is running
pm2 status

# 2. Check listening ports
netstat -an | findstr "3001"

# 3. Check Windows Firewall rules
Get-NetFirewallRule -DisplayName "JournalAPI-Port3001"

# 4. Check service logs
pm2 logs imperial-trade-broker-service --lines 50

# 5. Test local endpoint
Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing

# 6. Check external IP
Invoke-WebRequest -Uri "https://api.ipify.org" -UseBasicParsing
```

## ✅ Success Indicators

You'll know it's working when:
1. ✅ `netstat` shows `TCP    0.0.0.0:3001    LISTENING`
2. ✅ Local health check returns JSON
3. ✅ External health check returns JSON
4. ✅ Edge Function logs show "Testing connection via VPS"
5. ✅ Frontend connection test succeeds
6. ✅ Trades sync from MT5 to journal

## 📞 Next Steps After Fix

1. Test connection from frontend (Journal XX Pro)
2. Monitor Edge Function logs for any errors
3. Check VPS PM2 logs for connection attempts
4. Verify trades are syncing correctly
5. Set up HTTPS/SSL for production (recommended)







