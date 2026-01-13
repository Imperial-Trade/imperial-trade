# Deploy VPS Broker Service to Ubuntu VPS

## Quick Deploy (Copy-Paste Commands)

**VPS:** 209.222.12.247
**User:** root
**Password:** eJ)3-BJ9p9RsF2S$

---

## Step 1: Connect to VPS

```bash
ssh root@209.222.12.247
# Password: eJ)3-BJ9p9RsF2S$
```

---

## Step 2: Install Node.js (if not installed)

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs
node --version  # Should show v18.x
npm --version
```

---

## Step 3: Install Python MetaTrader5

```bash
pip3 install MetaTrader5
```

---

## Step 4: Clone Repository or Copy Files

**Option A: Clone from GitHub**
```bash
cd /root
git clone https://github.com/Imperial-Trade/imperial-trade.git
cd imperial-trade/vps-broker-service
```

**Option B: Manual Upload**
```bash
# From your local machine:
scp -r vps-broker-service root@209.222.12.247:/root/imperial-broker-service
```

---

## Step 5: Install Dependencies

```bash
cd /root/imperial-trade/vps-broker-service
# Or: cd /root/imperial-broker-service
npm install
```

---

## Step 6: Build TypeScript

```bash
npm run build
```

---

## Step 7: Configure Environment

```bash
cat > .env << 'EOF'
PORT=3000
VPS_API_KEY=Imperial_VPS_Secret_2026
ENCRYPTION_SECRET=ImperialTrade_BrokerEncryption_2025_v1
EOF
```

---

## Step 8: Install PM2 (Process Manager)

```bash
npm install -g pm2
```

---

## Step 9: Start Service

```bash
# Stop any existing service
pm2 delete imperial-broker-service || true

# Start new service
pm2 start dist/index.js --name "imperial-broker-service"

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup systemd -u root --hp /root
```

---

## Step 10: Verify Service is Running

```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs imperial-broker-service --lines 50

# Test health endpoint
curl http://localhost:3000/health
```

**Expected response:**
```json
{"status":"ok","service":"imperial-trade-broker-service"}
```

---

## Step 11: Open Firewall (if needed)

```bash
# Allow port 3000
ufw allow 3000/tcp
ufw reload
```

---

## Step 12: Test from Outside

```bash
# From your local machine:
curl http://209.222.12.247:3000/health
```

---

## PM2 Useful Commands

```bash
# View logs
pm2 logs imperial-broker-service

# Restart service
pm2 restart imperial-broker-service

# Stop service
pm2 stop imperial-broker-service

# Delete service
pm2 delete imperial-broker-service

# Monitor
pm2 monit
```

---

## Troubleshooting

### Service won't start
```bash
cd /root/imperial-trade/vps-broker-service
npm run build
pm2 restart imperial-broker-service
pm2 logs
```

### Python MT5 errors
```bash
pip3 install --upgrade MetaTrader5
```

### Port already in use
```bash
# Change PORT in .env to 3001
nano .env
pm2 restart imperial-broker-service
```

---

## ✅ Service Deployed!

**Service URL:** http://209.222.12.247:3000
**API Key:** Imperial_VPS_Secret_2026

**Next Step:** Update Supabase Edge Function with this URL
