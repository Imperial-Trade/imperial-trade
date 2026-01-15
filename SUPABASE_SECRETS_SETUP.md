# Supabase Secrets Setup - Quick Guide

## Generated Values

**VPS_API_KEY:** `bfa602cd4a12c93cd6a0f6cab9d93ff7b0fcd4dd2392f94e48db2013d679990d`

## Steps to Add Secrets

### Step 1: Navigate to Secrets Page

Go to: https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/functions/secrets

Or:
1. Go to Supabase Dashboard
2. Select your project: **Trade Imperial**
3. Click **Edge Functions** in sidebar
4. Click **Secrets** in the submenu

### Step 2: Add First Secret

Click **"New Secret"** button

**Name:** `VPS_MT5_SERVICE_URL`  
**Value:** `http://YOUR_VPS_IP:3001`

*(Replace YOUR_VPS_IP with your actual VPS IP address)*

Click **"Add Secret"**

### Step 3: Add Second Secret

Click **"New Secret"** button again

**Name:** `VPS_API_KEY`  
**Value:** `bfa602cd4a12c93cd6a0f6cab9d93ff7b0fcd4dd2392f94e48db2013d679990d`

Click **"Add Secret"**

### Step 4: Verify

You should now have these secrets in your list:
- ✅ `VPS_MT5_SERVICE_URL`
- ✅ `VPS_API_KEY`

## Notes

- The VPS_API_KEY must match exactly in both places:
  - Supabase Edge Function secret
  - VPS `.env` file (already set by setup script)
  
- VPS_MT5_SERVICE_URL format:
  - Use `http://` for plain HTTP
  - Use `https://` if you have SSL/domain set up
  - Replace `YOUR_VPS_IP` with actual IP (or domain)

## Quick Copy Values

**VPS_API_KEY:**
```
bfa602cd4a12c93cd6a0f6cab9d93ff7b0fcd4dd2392f94e48db2013d679990d
```

**VPS_MT5_SERVICE_URL (example):**
```
http://123.45.67.89:3001
```
*(Replace with your actual VPS IP)*








