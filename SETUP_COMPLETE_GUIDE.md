# 🚀 Complete Setup Guide - MT5 Auto-Sync Journal

## Overview
When users enter their MT5 credentials in the frontend, the VPS logs into MT5 and sends trade history back to Supabase.

**Simple Flow:**
```
User enters credentials → Frontend encrypts → Supabase saves → Edge Function calls VPS → VPS logs into MT5 → Fetches trades → Returns to Supabase → Frontend displays
```

---

## Step 1: Deploy Node.js Service to VPS ✅

**Follow:** `vps-broker-service/DEPLOY_TO_VPS.md`

**Quick Commands:**
```bash
# SSH into VPS
ssh root@209.222.12.247
# Password: eJ)3-BJ9p9RsF2S$

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install Python MT5
pip3 install MetaTrader5

# Go to project directory
cd /root/imperial-trade/vps-broker-service  # Or clone repo first

# Install dependencies
npm install

# Build TypeScript
npm run build

# Create .env file
cat > .env << 'EOF'
PORT=3000
VPS_API_KEY=Imperial_VPS_Secret_2026
ENCRYPTION_SECRET=ImperialTrade_BrokerEncryption_2025_v1
EOF

# Install PM2
npm install -g pm2

# Start service
pm2 start dist/index.js --name "imperial-broker-service"
pm2 save
pm2 startup systemd -u root --hp /root

# Verify
pm2 status
curl http://localhost:3000/health
```

**Expected Output:**
```json
{"status":"ok","service":"imperial-trade-broker-service"}
```

---

## Step 2: Configure Supabase Secrets 🔐

Go to Supabase Dashboard → Settings → Edge Functions → Secrets

**Add these 3 secrets:**

### Secret 1: VPS_MT5_SERVICE_URL
- Name: `VPS_MT5_SERVICE_URL`
- Value: `http://209.222.12.247:3000`

### Secret 2: VPS_API_KEY
- Name: `VPS_API_KEY`
- Value: `Imperial_VPS_Secret_2026`

### Secret 3: ENCRYPTION_SECRET
- Name: `ENCRYPTION_SECRET`
- Value: `ImperialTrade_BrokerEncryption_2025_v1`

**Dashboard URL:**
https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/settings/functions

---

## Step 3: Deploy Edge Function 🌐

The Edge Function `sync-broker-trades` is already in the repository.

**Deploy command:**
```bash
cd /home/user/imperial-trade
supabase functions deploy sync-broker-trades
```

**Or deploy via Supabase Dashboard:**
1. Go to: https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/functions
2. Click "Deploy new function"
3. Upload `supabase/functions/sync-broker-trades/index.ts`

---

## Step 4: Verify Frontend Configuration ✅

The frontend `.env` file already has the encryption secret:

```bash
# Already added to .env
VITE_ENCRYPTION_SECRET=ImperialTrade_BrokerEncryption_2025_v1
```

**Frontend component:** `src/components/journal-xx/AutoJournalView.tsx`
- ✅ Already configured
- ✅ Encrypts credentials
- ✅ Saves to broker_connections table
- ✅ Calls sync-broker-trades Edge Function

---

## Step 5: Open VPS Firewall (if needed) 🔥

```bash
# SSH into VPS
ssh root@209.222.12.247

# Allow port 3000
ufw allow 3000/tcp
ufw reload
```

---

## Step 6: Test End-to-End 🧪

### Test 1: VPS Service Health
```bash
curl http://209.222.12.247:3000/health
```

**Expected:**
```json
{"status":"ok","service":"imperial-trade-broker-service"}
```

### Test 2: Frontend Connection

1. Go to: https://tradeimperial.com (or localhost:8080)
2. Navigate to Journal XX Pro → Auto Journal
3. Click "Connect Your Broker"
4. Select "EC Markets"
5. Enter credentials:
   - **Login:** 81071266
   - **Password:** Imperial@2026
   - **Server:** ECMarkets-MT5-Live01
6. Click "Connect Broker"

**Expected Result:**
- ✅ "Broker Connected" toast notification
- ✅ Connection saved to database
- ✅ Click "Sync" button to fetch trades
- ✅ Trades appear in the UI

### Test 3: Check PM2 Logs
```bash
# On VPS
pm2 logs imperial-broker-service
```

**Look for:**
- Incoming request to `/fetch-trades`
- Decryption successful
- MT5 connection established
- Trades fetched

---

## Troubleshooting 🔧

### Issue: Service won't start
```bash
cd /root/imperial-trade/vps-broker-service
npm run build
pm2 restart imperial-broker-service
pm2 logs
```

### Issue: MT5 not connecting
```bash
# Check if MT5 is installed
ls /root/imperial-factory/mt5-master/terminal64.exe

# Try manual login test (from earlier):
cd /root/imperial-factory/mt5-master
wine terminal64.exe
```

### Issue: Frontend not syncing
- Check browser console for errors
- Verify Supabase secrets are set correctly
- Check Edge Function logs in Supabase Dashboard

### Issue: Encryption mismatch
All three must match:
- Frontend: `VITE_ENCRYPTION_SECRET`
- VPS: `ENCRYPTION_SECRET`
- Supabase: `ENCRYPTION_SECRET`

---

## Architecture Diagram 📊

```
┌─────────────────────────────────────────────────┐
│         FRONTEND (React/Vite)                   │
│  - User enters MT5 credentials                  │
│  - Encrypts with AES-256-GCM                    │
│  - Saves to broker_connections table            │
│  - Calls sync-broker-trades Edge Function       │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│     SUPABASE (PostgreSQL + Edge Functions)      │
│  - broker_connections table (encrypted creds)   │
│  - sync-broker-trades Edge Function             │
│  - Authenticates user                           │
│  - Fetches broker connection                    │
│  - Calls VPS HTTP service                       │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│      VPS UBUNTU (209.222.12.247:3000)           │
│  - Node.js + Express HTTP service               │
│  - Receives encrypted credentials               │
│  - Decrypts credentials                         │
│  - Calls Python MT5 script                      │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│        METATRADER 5 (via Python)                │
│  - MetaTrader5 Python library                   │
│  - Logs into broker account                     │
│  - Fetches trade history (last 30 days)         │
│  - Returns trades as JSON                       │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│           SUPABASE DATABASE                      │
│  - trade_journal_entries table                  │
│  - Stores synced trades                         │
│  - Realtime subscription updates frontend       │
└─────────────────────────────────────────────────┘
```

---

## ✅ Checklist

- [ ] VPS service deployed and running (PM2)
- [ ] Supabase secrets configured (3 secrets)
- [ ] Edge Function deployed
- [ ] Frontend .env has VITE_ENCRYPTION_SECRET
- [ ] Firewall port 3000 open
- [ ] Health check passes: http://209.222.12.247:3000/health
- [ ] Frontend can connect broker
- [ ] Trades sync successfully

---

## Success Criteria 🎯

When everything is working:
1. User enters MT5 credentials in frontend
2. Credentials are encrypted and saved
3. User clicks "Sync" button
4. VPS logs into MT5 with those credentials
5. Trade history is fetched (last 30 days)
6. Trades appear in frontend UI
7. User sees their trade history automatically

---

## Support

**VPS Access:**
- IP: 209.222.12.247
- User: root
- Password: eJ)3-BJ9p9RsF2S$

**Supabase:**
- URL: https://kmuoqkcxguafxulqlbmi.supabase.co
- Access Token: sbp_b7a054723ccb57908638330e0ea71550d92febc6

**Test Credentials (EC Markets):**
- Login: 81071266
- Password: Imperial@2026
- Server: ECMarkets-MT5-Live01
