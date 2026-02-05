# 🚀 Deploy Auto-Sync Journal - Quick Start

## ✅ What's Ready

1. ✅ Auto-sync service code created
2. ✅ Supabase edge function created
3. ✅ Database migration applied (unique constraint)
4. ✅ Code integrated into broker service

## 📋 Deployment Checklist

### Step 1: Deploy Supabase Edge Function

**On your Mac (local machine):**

```bash
cd "/Users/nthny_11/Trade imperial GITHUB /nov 7 notif project/imperial-trade"
supabase functions deploy journal-ingestor
```

**Set Edge Function Secret:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/functions)
2. Click on `journal-ingestor`
3. Go to Settings → Secrets
4. Add secret:
   - **Name:** `INGEST_SECRET`
   - **Value:** (Same as `INGEST_SECRET` in your price-ingestor function, or generate a new one)

### Step 2: Copy Updated Code to VPS

**On your Mac:**

The updated `vps-broker-service` folder needs to be copied to your VPS at `C:\vps-broker-service`

You can:
- Use RDP file sharing
- Or use SCP/SFTP if configured
- Or manually copy the folder

### Step 3: Update VPS Environment Variables

**On your VPS (PowerShell):**

```powershell
cd C:\vps-broker-service
notepad .env
```

**Add these lines to your existing .env file:**

```bash
# Auto-Sync Configuration
SUPABASE_URL=https://kmuoqkcxguafxulqlbmi.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
INGEST_SECRET=your-ingest-secret-here
SYNC_INTERVAL=30000
```

**Where to get these values:**
- `SUPABASE_URL`: `https://kmuoqkcxguafxulqlbmi.supabase.co` (already shown above)
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase Dashboard → Settings → API → service_role key (starts with `eyJ...`)
- `INGEST_SECRET`: Same value you set in Step 1 (edge function secret)
- `SYNC_INTERVAL`: `30000` = 30 seconds (default)

### Step 4: Rebuild and Restart Service

**On your VPS (PowerShell):**

```powershell
cd C:\vps-broker-service

# Install any new dependencies
npm install

# Build TypeScript
npm run build

# Restart with PM2
pm2 delete "Imperial Broker Service"
pm2 start dist/index.js --name "Imperial Broker Service"
pm2 save

# Check logs
pm2 logs "Imperial Broker Service" --lines 30
```

**Expected output:**
```
🚀 Imperial Trade Broker Service running on port 3001
🚀 Auto-Sync Journal Service starting...
📊 Sync interval: 30 seconds
🔗 Supabase URL: https://kmuoqkcxguafxulqlbmi.supabase.co
📡 Journal Ingestor: https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/journal-ingestor
✅ Auto-Sync Journal Service running
```

### Step 5: Verify It's Working

**Check logs every 30 seconds:**
```powershell
pm2 logs "Imperial Broker Service" --lines 50
```

You should see sync cycles:
```
🔄 [2026-01-06T...] Starting sync cycle...
📋 Found 1 active broker connection(s)
🔄 Syncing trades for connection abc-123 (user: xyz-789)
✅ Successfully synced 5 trades for connection abc-123
✅ Sync cycle completed at 2026-01-06T...
```

## 🎯 Quick Test

1. **Make sure a user has an active broker connection:**
   - User must have connected their broker in the app
   - Connection must have `is_active = true` in `broker_connections` table

2. **Wait 30 seconds** after service starts

3. **Check Supabase:**
   ```sql
   SELECT * FROM trade_journal_entries 
   WHERE is_synced = true 
     AND sync_source = 'auto_sync'
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

4. **Check broker_connections:**
   ```sql
   SELECT id, last_sync_at, last_error 
   FROM broker_connections 
   WHERE is_active = true;
   ```

## 🐛 Troubleshooting

### Auto-sync not starting:
- Check `.env` has all required variables
- Check logs: `pm2 logs "Imperial Broker Service"`
- Verify no TypeScript errors: `npm run build`

### No trades syncing:
- Check if user has active connection: `SELECT * FROM broker_connections WHERE is_active = true`
- Check MT5 is running: `tasklist | findstr terminal64`
- Check Python: `python -c "import MetaTrader5; print('OK')"`

### Edge function errors:
- Check Supabase Dashboard → Edge Functions → journal-ingestor → Logs
- Verify `INGEST_SECRET` matches in both VPS `.env` and Supabase secrets

## 📊 Monitoring

**View real-time logs:**
```powershell
pm2 logs "Imperial Broker Service" --follow
```

**Check PM2 status:**
```powershell
pm2 list
```

**View all services:**
```powershell
pm2 list
# Should show:
# - Imperial Price Feeder (online)
# - MT5 Watchdog (online)
# - Imperial Broker Service (online) ← This one runs auto-sync
```

## ✅ Success Indicators

- ✅ Service logs show "Auto-Sync Journal Service running"
- ✅ Every 30 seconds, logs show sync cycles
- ✅ `broker_connections.last_sync_at` updates
- ✅ Trades appear in `trade_journal_entries` with `is_synced = true`
- ✅ No errors in logs

---

**Ready to deploy?** Follow the steps above in order! 🚀


