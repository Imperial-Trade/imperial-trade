# Windows VPS Setup Guide

## VPS Credentials

- **IP Address:** `45.32.89.134`
- **Username:** `Administrator`
- **Password:** [As provided in your Vultr dashboard]

## Quick Setup Steps

### Step 1: Connect to Your VPS

1. Use Remote Desktop Connection (RDP) to connect:
   - Press `Win + R`
   - Type `mstsc` and press Enter
   - Enter IP: `45.32.89.134`
   - Username: `Administrator`
   - Password: [Your Vultr password]

### Step 2: Install Prerequisites

Open PowerShell as Administrator and run:

```powershell
# Install Node.js 18+ (if not installed)
# Download from: https://nodejs.org/en/download/
# Or use Chocolatey:
choco install nodejs -y

# Install Python 3.8+ (if not installed)
# Download from: https://www.python.org/downloads/
# Or use Chocolatey:
choco install python -y

# Install PM2 globally
npm install -g pm2

# Install Python MetaTrader5 package
pip install MetaTrader5

# Install Git (if not installed)
choco install git -y
```

### Step 3: Clone or Upload Project Files

**Option A: Using Git (Recommended)**
```powershell
# Clone your repository
git clone [your-repo-url]
cd imperial-trade
```

**Option B: Manual Upload**
- Upload the `vps-broker-service` folder to your VPS
- Use SFTP, FileZilla, or Windows File Explorer over network

### Step 4: Navigate to Service Directory

```powershell
cd vps-broker-service
```

### Step 5: Install Node.js Dependencies

```powershell
npm install
```

### Step 6: Build TypeScript

```powershell
npm run build
```

### Step 7: Configure Environment Variables

Create `.env` file in `vps-broker-service` directory:

```powershell
# Copy from example
Copy-Item .env.example .env

# Edit the file
notepad .env
```

**Required .env values:**
```env
PORT=3001
VPS_API_KEY=bfa602cd4a12c93cd6a0f6cab9d93ff7b0fcd4dd2392f94e48db2013d679990d
SUPABASE_URL=https://kmuoqkcxguafxulqlbmi.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[Get from Supabase Dashboard → Settings → API]
INGEST_SECRET=[Get from Supabase Edge Functions Secrets]
ENCRYPTION_SECRET=[Get from Supabase Edge Functions Secrets]
```

**Where to find these values:**
1. **SUPABASE_SERVICE_ROLE_KEY:**
   - Go to: https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/settings/api
   - Copy the `service_role` key (keep it secret!)

2. **INGEST_SECRET:**
   - Go to: https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/functions/secrets
   - Find `INGEST_SECRET` and copy its value

3. **ENCRYPTION_SECRET:**
   - Same page as above
   - Find `ENCRYPTION_SECRET` and copy its value

### Step 8: Install and Configure MT5 Terminal

1. **Download Generic MT5 Terminal:**
   - Download from your broker's website
   - Install to default location: `C:\Program Files\MetaTrader 5\terminal64.exe`

2. **Login to MT5 at least once:**
   - Open MT5 Terminal
   - Login with your credentials
   - Close the terminal (service will reopen it automatically)

### Step 9: Start the Service with PM2

```powershell
# Start the service
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Enable auto-start on Windows boot
pm2 startup
# Follow the instructions shown (will require running a command as Administrator)
```

### Step 10: Verify Service is Running

```powershell
# Check status
pm2 status

# View logs
pm2 logs imperial-trade-broker-service

# Test health endpoint
curl http://localhost:3001/health
# Or in browser: http://localhost:3001/health
```

You should see:
```json
{"status":"ok","service":"imperial-trade-broker-service","timestamp":"..."}
```

### Step 11: Configure Windows Firewall

Allow inbound connections on port 3001:

```powershell
# Run as Administrator
New-NetFirewallRule -DisplayName "MT5 Broker Service" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
```

### Step 12: Verify Supabase Secrets

Confirm these secrets are set in Supabase:
- ✅ `VPS_MT5_SERVICE_URL` = `http://45.32.89.134:3001`
- ✅ `VPS_API_KEY` = `bfa602cd4a12c93cd6a0f6cab9d93ff7b0fcd4dd2392f94e48db2013d679990d`

## Testing the Connection

### From Your Local Machine:

```powershell
# Test health endpoint
curl http://45.32.89.134:3001/health
```

### From Journal XX Pro:

1. Open Journal XX Pro application
2. Go to "Auto Journal" view
3. Select "MT5" broker
4. Enter credentials:
   - Login: Your MT5 account number
   - Password: Your MT5 password
   - Server: `ECMarketsLtd-Demo` (or as shown in your MT5 terminal)
5. Click "Connect Broker"
6. Click "Test" to verify connection
7. Click "Sync Now" to fetch trades

## Monitoring & Maintenance

### View Logs

```powershell
# Real-time logs
pm2 logs imperial-trade-broker-service

# Last 100 lines
pm2 logs imperial-trade-broker-service --lines 100

# Logs only (no metrics)
pm2 logs imperial-trade-broker-service --nostream --lines 50
```

### Service Management

```powershell
# Restart service
pm2 restart imperial-trade-broker-service

# Stop service
pm2 stop imperial-trade-broker-service

# Start service
pm2 start imperial-trade-broker-service

# Delete service (stops and removes from PM2)
pm2 delete imperial-trade-broker-service
```

### Monitor Resource Usage

```powershell
# Real-time monitoring
pm2 monit
```

## Troubleshooting

### Service Won't Start

1. **Check PM2 logs:**
   ```powershell
   pm2 logs imperial-trade-broker-service --lines 100
   ```

2. **Verify .env file exists:**
   ```powershell
   Test-Path .env
   Get-Content .env
   ```

3. **Check port 3001 is available:**
   ```powershell
   netstat -ano | findstr :3001
   ```

4. **Verify dependencies:**
   ```powershell
   node --version  # Should be 18+
   python --version  # Should be 3.8+
   npm list MetaTrader5  # Should be installed
   ```

### Connection Test Fails

1. **Ensure MT5 Terminal is installed:**
   ```powershell
   Test-Path "C:\Program Files\MetaTrader 5\terminal64.exe"
   ```

2. **Verify MT5 credentials are correct**

3. **Check server name matches exactly** (case-sensitive)

4. **Review PM2 logs for detailed errors**

### Trades Not Syncing

1. **Check auto-sync is running:**
   ```powershell
   pm2 logs imperial-trade-broker-service | Select-String "auto-sync"
   ```

2. **Verify trades are:**
   - Fully closed (not just opened)
   - Within last 90 days
   - Have valid timestamps

3. **Test manual sync from Journal XX Pro**

### Cannot Connect from External IP

1. **Check Windows Firewall:**
   ```powershell
   Get-NetFirewallRule | Where-Object {$_.DisplayName -like "*MT5*"}
   ```

2. **Verify VPS firewall rules** (check Vultr dashboard)

3. **Test locally first:**
   ```powershell
   curl http://localhost:3001/health
   ```

## Security Notes

- ✅ Never share your `.env` file
- ✅ Keep `VPS_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` secret
- ✅ Use HTTPS in production (consider adding reverse proxy with SSL)
- ✅ Regularly update dependencies
- ✅ Monitor PM2 logs for suspicious activity

## Next Steps

1. ✅ Service is running and healthy
2. ✅ Test connection from Journal XX Pro
3. ✅ Sync trades manually first
4. ✅ Monitor auto-sync for 24 hours
5. ✅ Set up log rotation (optional)
6. ✅ Consider setting up monitoring/alerting (optional)

## Support

If you encounter issues:
1. Check PM2 logs first
2. Verify all configuration values
3. Test each component individually
4. Review the troubleshooting section above








