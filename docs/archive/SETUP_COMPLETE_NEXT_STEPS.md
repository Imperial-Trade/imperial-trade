# ✅ Auto-Sync Setup Complete - Next Steps

## 🎉 What's Been Done

1. ✅ **EC Markets MT5**: Verified and running
2. ✅ **Python MetaTrader5**: Installed
3. ✅ **Node.js & PM2**: Verified
4. ✅ **Broker Service**: Built and running
5. ✅ **.env File**: Updated with all required variables
6. ✅ **PM2 Service**: Running "Imperial Broker Service"

## ⚠️ Required: Set Supabase Secrets

### Step 1: Set INGEST_SECRET in Supabase Edge Functions

1. Go to: https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/functions/secrets
2. Click **"Add Secret"** or **"New Secret"**
3. Enter:
   - **Name:** `INGEST_SECRET`
   - **Value:** `ImperialTrade_IngestSecret_2025_v1`
4. Click **Save**

**Important:** This secret must match the one in your VPS `.env` file!

### Step 2: Get Service Role Key

1. Go to: https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/settings/api
2. Find the **"service_role"** key (it starts with `eyJ...`)
3. Copy the entire key

### Step 3: Update VPS .env with Service Role Key

Run this on your VPS (or I can do it via WinRM):

```powershell
# Edit the .env file
notepad C:\vps-broker-service\.env

# Replace YOUR_SERVICE_ROLE_KEY_HERE with your actual service role key
# Then save and close
```

Or via PowerShell:
```powershell
$serviceRoleKey = "YOUR_ACTUAL_SERVICE_ROLE_KEY_HERE"
$envPath = "C:\vps-broker-service\.env"
$content = Get-Content $envPath -Raw
$newContent = $content -replace 'SUPABASE_SERVICE_ROLE_KEY=.*', "SUPABASE_SERVICE_ROLE_KEY=$serviceRoleKey"
$newContent | Out-File -FilePath $envPath -Encoding UTF8 -NoNewline
```

### Step 4: Restart Service

After updating the service role key:

```powershell
pm2 restart "Imperial Broker Service"
pm2 logs "Imperial Broker Service" --lines 20
```

## ✅ Verification

Once both secrets are set:

1. **Check Service Logs:**
   ```powershell
   pm2 logs "Imperial Broker Service" --lines 50
   ```

2. **Look for:**
   - ✅ "Auto-sync scheduler started"
   - ✅ "Fetching active broker connections"
   - ❌ No errors about missing SUPABASE_SERVICE_ROLE_KEY
   - ❌ No errors about missing INGEST_SECRET

3. **Test Auto-Sync:**
   - Connect a broker in your app
   - Wait 30-60 seconds
   - Check if trades appear in your journal

## 📋 Current .env Configuration

Your VPS `.env` file currently has:
- ✅ `PORT=3001`
- ✅ `VPS_API_KEY=ImperialTrade_BrokerSync_SecureKey_2025`
- ✅ `ENCRYPTION_SECRET=ImperialTrade_BrokerEncryption_2025_v1`
- ✅ `SUPABASE_URL=https://kmuoqkcxguafxulqlbmi.supabase.co`
- ✅ `INGEST_SECRET=ImperialTrade_IngestSecret_2025_v1`
- ⚠️ `SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY_HERE` (NEEDS UPDATE)
- ✅ `SYNC_INTERVAL=30000`

## 🚀 Once Complete

The auto-sync will:
- Run every 30 seconds
- Fetch trades from all active broker connections
- Send them to Supabase `journal-ingestor` function
- Upsert them into `trade_journal_entries` table

---

**Need Help?** The service is already running. Just update the service role key and set the INGEST_SECRET in Supabase, then restart the service!


