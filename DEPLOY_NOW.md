# 🚀 DEPLOY NOW - 3 Simple Commands

## Prerequisites

**Install sshpass (for automated SSH):**

**Mac:**
```bash
brew install hudochenkov/sshpass/sshpass
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install sshpass
```

**Linux (CentOS/RHEL):**
```bash
sudo yum install sshpass
```

---

## Step 1: Deploy to VPS (5 minutes)

```bash
cd /home/user/imperial-trade
./deploy-vps.sh
```

**What it does:**
- Connects to VPS (209.222.12.247)
- Installs Node.js if needed
- Installs Python MetaTrader5
- Clones/updates repository
- Builds TypeScript
- Starts service with PM2
- Opens firewall
- Verifies everything works

**Expected output:** Green checkmarks ✓ and "Deployment Successful! 🎉"

---

## Step 2: Configure Supabase (2 minutes)

**Option A: Manual (Recommended)**
1. Go to: https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/settings/functions
2. Click "Add new secret" (3 times)
3. Add these secrets:

**Secret 1:**
- Name: `VPS_MT5_SERVICE_URL`
- Value: `http://209.222.12.247:3000`

**Secret 2:**
- Name: `VPS_API_KEY`
- Value: `Imperial_VPS_Secret_2026`

**Secret 3:**
- Name: `ENCRYPTION_SECRET`
- Value: `ImperialTrade_BrokerEncryption_2025_v1`

**Option B: Automated (if Supabase CLI installed)**
```bash
./configure-supabase.sh
```

---

## Step 3: Test Everything (1 minute)

```bash
./test-deployment.sh
```

**Expected output:** All green checkmarks ✓

---

## Step 4: Test from Frontend (2 minutes)

1. **Open:** https://tradeimperial.com (or http://localhost:8080)

2. **Navigate:** Journal XX Pro → Auto Journal tab

3. **Click:** "Connect Your Broker"

4. **Select:** "EC Markets"

5. **Enter EC Markets credentials:**
   ```
   Login:    81071266
   Password: Imperial@2026
   Server:   ECMarkets-MT5-Live01
   ```

6. **Click:** "Connect Broker"

7. **Wait:** For success toast notification

8. **Click:** Sync button (refresh icon)

9. **Watch:** Trades appear! 🎉

---

## What Happens Behind the Scenes

```
1. User enters credentials in frontend
2. Frontend encrypts with AES-256-GCM
3. Saves to Supabase broker_connections table
4. User clicks "Sync" button
5. Edge Function calls VPS at http://209.222.12.247:3000
6. VPS decrypts credentials
7. Python script logs into MT5
8. Fetches last 30 days of trades
9. Returns to Edge Function
10. Saves to trade_journal_entries table
11. Frontend displays trades in real-time
```

---

## Troubleshooting

### deploy-vps.sh fails with "sshpass: command not found"
Install sshpass (see Prerequisites above)

### deploy-vps.sh fails with "Permission denied"
Check VPS password is correct: `eJ)3-BJ9p9RsF2S$`

### VPS service won't start
SSH into VPS and check logs:
```bash
ssh root@209.222.12.247
pm2 logs imperial-broker-service
```

### Frontend sync fails
1. Check Supabase secrets are set correctly
2. Check VPS service health: `curl http://209.222.12.247:3000/health`
3. Check browser console for errors

### Encryption errors
Verify all three match:
- Frontend .env: `VITE_ENCRYPTION_SECRET=ImperialTrade_BrokerEncryption_2025_v1`
- VPS .env: `ENCRYPTION_SECRET=ImperialTrade_BrokerEncryption_2025_v1`
- Supabase secret: `ENCRYPTION_SECRET=ImperialTrade_BrokerEncryption_2025_v1`

---

## Manual Deployment (if scripts fail)

See `vps-broker-service/DEPLOY_TO_VPS.md` for step-by-step manual instructions.

---

## Useful Commands

**Check VPS service status:**
```bash
ssh root@209.222.12.247 "pm2 status"
```

**View VPS logs:**
```bash
ssh root@209.222.12.247 "pm2 logs imperial-broker-service"
```

**Restart VPS service:**
```bash
ssh root@209.222.12.247 "pm2 restart imperial-broker-service"
```

**Test VPS health:**
```bash
curl http://209.222.12.247:3000/health
```

---

## Success Criteria ✅

When everything works:
- ✅ `deploy-vps.sh` completes with "Deployment Successful!"
- ✅ `test-deployment.sh` shows all green checkmarks
- ✅ Frontend shows "Broker Connected" toast
- ✅ Trades appear in frontend after clicking Sync
- ✅ User sees their MT5 trade history automatically

---

## Time Estimate

- **Total:** ~10 minutes
- Step 1 (VPS Deploy): 5 minutes
- Step 2 (Supabase Config): 2 minutes
- Step 3 (Test): 1 minute
- Step 4 (Frontend): 2 minutes

---

## Need Help?

**Full Documentation:**
- `SETUP_COMPLETE_GUIDE.md` - Complete architecture guide
- `NEXT_STEPS.md` - Quick start guide
- `vps-broker-service/DEPLOY_TO_VPS.md` - Manual deployment steps

**Credentials (for reference):**
- VPS: root@209.222.12.247 (password: eJ)3-BJ9p9RsF2S$)
- Supabase: https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi
- EC Markets Test: 81071266 / Imperial@2026 / ECMarkets-MT5-Live01
