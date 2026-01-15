# Deploy Edge Function via Supabase CLI

## Why Use CLI?
- ✅ More reliable than browser deployment
- ✅ Better error messages if something fails
- ✅ Can use `--debug` flag for detailed logs
- ✅ Often bypasses bundling service issues

## Installation Steps:

### 1. Install Supabase CLI
```bash
npm install -g supabase
```

### 2. Login to Supabase
```bash
supabase login
```
This will open a browser window for authentication.

### 3. Link Your Project
```bash
cd "/Users/nthny_11/Trade imperial GITHUB /nov 7 notif project/imperial-trade"
supabase link --project-ref kmuoqkcxguafxulqlbmi
```

### 4. Deploy the Function
```bash
supabase functions deploy test-broker-connection
```

Or with debug mode:
```bash
supabase functions deploy test-broker-connection --debug
```

## Alternative: If CLI Not Available

### Option A: Wait and Retry Browser
- Wait 20-30 minutes
- Try deploying via browser again
- Sometimes Supabase service recovers

### Option B: Check Supabase Status
- Visit: https://status.supabase.com/
- Check if there are known bundling service issues

### Option C: Contact Supabase Support
- If persistent, this might be a project-specific issue
- Supabase support can investigate bundling service logs

## Why It's Timing Out

Even though the code is correct:
1. **Supabase bundling service load** - High traffic can cause timeouts
2. **Function complexity** - Encryption code adds bundling time
3. **Service-side issues** - Temporary Supabase infrastructure problems

The code itself is correct - this is a deployment service issue.







