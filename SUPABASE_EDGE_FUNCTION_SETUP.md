# Supabase Edge Function Configuration for MT5 Broker Service

## Project Information
- **Project ID:** `kmuoqkcxguafxulqlbmi`
- **Project Name:** Trade Imperial
- **Region:** us-west-1
- **Status:** ACTIVE_HEALTHY

## Required Edge Function Secrets

### Step 1: Configure Secrets in Supabase Dashboard

Go to: **Supabase Dashboard → Project Settings → Edge Functions → Secrets**

Add these two secrets:

#### 1. VPS_MT5_SERVICE_URL
```
http://YOUR_VPS_IP:3001
```
**Example:** `http://123.45.67.89:3001`

**Note:** 
- Replace `YOUR_VPS_IP` with your actual VPS IP address
- If you have a domain name, you can use: `https://yourdomain.com/mt5-api`
- Make sure port 3001 is accessible from the internet (firewall configured)

#### 2. VPS_API_KEY
```
YOUR_SECURE_API_KEY_HERE
```
**Important:** 
- This must match the `VPS_API_KEY` in your VPS `.env` file
- Generate a secure random string (at least 32 characters)
- Example: `sk_live_abc123xyz789secure_key_2025`

### Step 2: Verify Edge Functions Exist

The following Edge Functions should be deployed:

1. ✅ `sync-broker-trades` - Syncs trades from MT5
2. ✅ `test-broker-connection` - Tests MT5 connection

**Location:** `supabase/functions/sync-broker-trades/` and `supabase/functions/test-broker-connection/`

### Step 3: Deploy Edge Functions (if not already deployed)

If the Edge Functions are not deployed yet:

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Link to your project
supabase link --project-ref kmuoqkcxguafxulqlbmi

# Deploy the functions
supabase functions deploy sync-broker-trades
supabase functions deploy test-broker-connection
```

### Step 4: Test Configuration

After setting secrets, test the connection:

1. **In Journal XX Pro:**
   - Go to Auto Journal view
   - Enter your MT5 credentials
   - Click "Test" button
   - Should show: "Connection Verified ✅"

2. **Check Edge Function Logs:**
   - Go to: Supabase Dashboard → Edge Functions → Logs
   - Filter by: `sync-broker-trades` or `test-broker-connection`
   - Look for connection attempts and errors

## Troubleshooting

### Error: "VPS service is not reachable"
- ✅ Verify VPS service is running: `pm2 status` on VPS
- ✅ Check VPS firewall allows port 3001
- ✅ Verify `VPS_MT5_SERVICE_URL` is correct in Supabase secrets
- ✅ Test from browser: `http://YOUR_VPS_IP:3001/health`

### Error: "Invalid API key"
- ✅ Verify `VPS_API_KEY` matches in both places:
  - Supabase Edge Function secret
  - VPS `.env` file
- ✅ Keys are case-sensitive

### Error: "MT5 initialization failed"
- ✅ Ensure Generic MT5 Terminal is running on VPS
- ✅ MT5 Terminal must be logged in at least once
- ✅ Check "Allow Algorithmic Trading" is enabled in MT5

## Quick Setup Checklist

- [ ] VPS service running on port 3001
- [ ] `VPS_API_KEY` set in VPS `.env` file
- [ ] `VPS_MT5_SERVICE_URL` secret added in Supabase
- [ ] `VPS_API_KEY` secret added in Supabase (matches VPS `.env`)
- [ ] Edge Functions deployed
- [ ] Firewall allows port 3001
- [ ] MT5 Terminal running on VPS

## Next Steps

1. Set the secrets in Supabase Dashboard
2. Verify VPS service is accessible: `curl http://YOUR_VPS_IP:3001/health`
3. Test connection in Journal XX Pro
4. Monitor Edge Function logs for any errors








