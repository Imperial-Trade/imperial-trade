# VPS Broker Service Setup Guide

## Overview

This service handles auto-journaling by connecting to users' MT5 brokers to fetch their trade history.

**IMPORTANT**: This service does NOT interfere with the live price feeder:
- Price feeder uses EC Markets MT5 Terminal (always running)
- Broker service uses Python MT5 API to temporarily login to user's broker
- Both can coexist on the same VPS

## Prerequisites

On your Windows VPS, you should already have:
- ✅ Node.js installed
- ✅ Python 3.11+ installed
- ✅ MetaTrader5 Python library (`pip install MetaTrader5`)
- ✅ EC Markets MT5 Terminal running (for price feeder)
- ✅ PM2 installed (`npm install -g pm2`)

## Setup Steps

### Step 1: Copy the Broker Service to VPS

On your Mac, the `vps-broker-service` folder is in your project. Copy it to your VPS:

1. Open the shared folder between Mac and VPS
2. Copy the entire `vps-broker-service` folder to `C:\vps-broker-service`

### Step 2: Install Dependencies

In PowerShell on your VPS:

```powershell
cd C:\vps-broker-service
npm install
```

### Step 3: Create .env File

```powershell
copy .env.example .env
notepad .env
```

Edit the `.env` file:
```
PORT=3001
VPS_API_KEY=your-secure-api-key-here
ENCRYPTION_SECRET=ImperialTrade_BrokerEncryption_2025_v1
```

Generate a secure API key (you can use: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)

### Step 4: Build the Service

```powershell
npm run build
```

### Step 5: Start with PM2

```powershell
pm2 start dist/index.js --name "Imperial Broker Service"
pm2 save
```

### Step 6: Verify Both Services Running

```powershell
pm2 status
```

You should see:
```
┌─────┬─────────────────────────┬─────────┬─────────┬──────────┐
│ id  │ name                    │ mode    │ status  │ cpu      │
├─────┼─────────────────────────┼─────────┼─────────┼──────────┤
│ 0   │ Imperial Price Feeder   │ fork    │ online  │ 0%       │
│ 1   │ Imperial Broker Service │ fork    │ online  │ 0%       │
└─────┴─────────────────────────┴─────────┴─────────┴──────────┘
```

### Step 7: Test the Service

```powershell
curl http://localhost:3001/health
```

Should return: `{"status":"ok","service":"imperial-trade-broker-service"}`

## Configure Supabase Edge Functions

### Set Environment Variables in Supabase

Go to Supabase Dashboard → Project Settings → Edge Functions → Secrets

Add these secrets:
- `VPS_MT5_SERVICE_URL`: Your VPS public IP with port (e.g., `http://YOUR_VPS_IP:3001`)
- `VPS_API_KEY`: Same API key you put in the .env file
- `ENCRYPTION_SECRET`: Same encryption secret

### Deploy Edge Functions

The `sync-broker-trades` Edge Function is already in the project. Deploy it:

```bash
supabase functions deploy sync-broker-trades
```

## How It Works

1. User connects their broker in the app (XS.com, EC Markets, PU Prime)
2. Frontend encrypts credentials with AES-256-GCM
3. Encrypted credentials stored in Supabase `broker_connections` table
4. When syncing trades:
   - Edge Function calls VPS Broker Service
   - Service decrypts credentials
   - Python script logs into user's broker via MT5 API
   - Fetches trade history
   - Returns trades to Edge Function
   - Edge Function saves to `trade_journal_entries`

## Troubleshooting

### Check Broker Service Logs
```powershell
pm2 logs "Imperial Broker Service" --lines 50
```

### Check if Port 3001 is Open
You may need to open port 3001 in Windows Firewall:
```powershell
New-NetFirewallRule -DisplayName "Broker Service" -Direction Inbound -Port 3001 -Protocol TCP -Action Allow
```

### Verify MT5 Terminal is Running
The Python MT5 library requires an MT5 Terminal to be running. Your EC Markets MT5 (for price feeder) serves this purpose.


