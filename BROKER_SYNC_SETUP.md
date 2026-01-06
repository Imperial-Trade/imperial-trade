# Broker Sync Setup Guide

Complete guide to set up automatic broker trade syncing with MT5.

## Prerequisites

1. ✅ VPS with Windows OS (Vultr/DigitalOcean)
2. ✅ MetaTrader 5 terminal installed on VPS
3. ✅ Node.js 18+ installed on VPS
4. ✅ Python 3.8+ installed on VPS
5. ✅ Supabase project with Edge Functions enabled

## Step 1: Deploy VPS Broker Service

### On Your VPS:

1. **Copy the service to VPS:**
   ```bash
   # On your local machine, zip the service
   cd vps-broker-service
   zip -r broker-service.zip .
   ```

2. **Upload to VPS** (use FileZilla, SCP, or shared folder)

3. **On VPS, extract and setup:**
   ```bash
   cd C:\
   unzip broker-service.zip -d imperial-broker-service
   cd imperial-broker-service
   ```

4. **Install Node.js dependencies:**
   ```bash
   npm install
   ```

5. **Install Python dependencies:**
   ```bash
   pip install MetaTrader5
   ```

6. **Create `.env` file:**
   ```bash
   copy .env.example .env
   notepad .env
   ```
   
   Set these values:
   ```env
   PORT=3000
   VPS_API_KEY=your-very-secure-random-api-key-here
   ENCRYPTION_SECRET=ImperialTrade_BrokerEncryption_2025_v1
   ```
   
   **Important:** Generate a secure random API key (use `openssl rand -hex 32` or similar)

7. **Build and test:**
   ```bash
   npm run build
   npm start
   ```

8. **Run as Windows Service (24/7):**
   ```bash
   npm install -g pm2
   pm2 start dist/index.js --name "imperial-broker-service"
   pm2 save
   pm2 startup
   ```

9. **Get your VPS IP address:**
   - Check your VPS provider dashboard
   - Or run: `ipconfig` (Windows) to see your public IP

## Step 2: Configure Supabase Secrets

### In Supabase Dashboard:

1. Go to **Project Settings** → **Edge Functions** → **Secrets**

2. Add these secrets:

   **VPS_MT5_SERVICE_URL:**
   ```
   http://YOUR_VPS_IP:3000
   ```
   Example: `http://123.45.67.89:3000`
   
   **VPS_API_KEY:**
   ```
   your-very-secure-random-api-key-here
   ```
   (Must match the `VPS_API_KEY` in your VPS `.env` file)

   **ENCRYPTION_SECRET:**
   ```
   ImperialTrade_BrokerEncryption_2025_v1
   ```
   (Must match the `ENCRYPTION_SECRET` in your VPS `.env` file)

## Step 3: Configure Frontend Environment

### In your frontend `.env` file:

Add:
```env
VITE_ENCRYPTION_SECRET=ImperialTrade_BrokerEncryption_2025_v1
```

**Important:** This must match the `ENCRYPTION_SECRET` in Supabase and VPS.

## Step 4: Deploy Edge Functions

### Deploy test-broker-connection:

```bash
cd supabase/functions
supabase functions deploy test-broker-connection
```

### Deploy sync-broker-trades:

```bash
supabase functions deploy sync-broker-trades
```

## Step 5: Test the Setup

1. **Test VPS Service:**
   ```bash
   curl http://YOUR_VPS_IP:3000/health
   ```
   Should return: `{"status":"ok","service":"imperial-trade-broker-service"}`

2. **Test in Frontend:**
   - Go to Journal XX Pro
   - Select a broker (EC Markets, XS.com, or PU Prime)
   - Enter your MT5 credentials
   - Click "Connect Broker"
   - Should successfully connect and save

3. **Test Trade Sync:**
   - After connecting, click the sync button
   - Should fetch trades from your MT5 account
   - Trades should appear in Journal XX Pro

## Troubleshooting

### VPS Service Not Starting
- Check if port 3000 is open in firewall
- Verify Node.js is installed: `node --version`
- Check logs: `pm2 logs imperial-broker-service`

### Connection Test Fails
- Verify MT5 terminal is installed and running on VPS
- Check if Python MetaTrader5 library is installed: `pip list | grep MetaTrader5`
- Verify credentials are correct
- Check VPS service logs

### Edge Function Errors
- Verify Supabase secrets are set correctly
- Check Edge Function logs in Supabase dashboard
- Ensure VPS_API_KEY matches in both places
- Verify VPS_MT5_SERVICE_URL is accessible from Supabase

### Encryption Errors
- Ensure `ENCRYPTION_SECRET` matches in:
  - Frontend `.env` (as `VITE_ENCRYPTION_SECRET`)
  - VPS `.env` (as `ENCRYPTION_SECRET`)
  - Supabase secrets (as `ENCRYPTION_SECRET`)

## Security Notes

1. **Never commit `.env` files** to git
2. **Use strong API keys** (32+ random characters)
3. **Keep encryption secret secure** - if compromised, all encrypted data must be re-encrypted
4. **Use HTTPS** in production (set up reverse proxy with SSL)
5. **Firewall rules** - only allow port 3000 from Supabase IP ranges

## Production Checklist

- [ ] VPS service running 24/7 (PM2 or Windows Service)
- [ ] Firewall configured (port 3000 open)
- [ ] Supabase secrets configured
- [ ] Edge functions deployed
- [ ] Frontend `.env` configured
- [ ] Encryption secret matches everywhere
- [ ] Test connection works
- [ ] Test trade sync works
- [ ] Monitor logs for errors

## Next Steps

Once everything is working:
1. Set up automatic sync (every 5 minutes) - already implemented in `AutoJournalView.tsx`
2. Monitor sync errors in `broker_connections.last_error`
3. Set up alerts for failed syncs
4. Consider adding rate limiting
5. Add SSL/HTTPS for production




