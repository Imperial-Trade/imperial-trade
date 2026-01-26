# Deploy Edge Function via Supabase CLI

## ✅ Supabase CLI Installed Successfully!

**Version:** 2.67.1 (upgraded from 2.54.11)

## Next Steps to Deploy:

### Step 1: Login to Supabase

```bash
supabase login
```

This will:
- Open your browser
- Ask you to authenticate with Supabase
- Save your credentials locally

### Step 2: Navigate to Project Directory

```bash
cd "/Users/nthny_11/Trade imperial GITHUB /nov 7 notif project/imperial-trade"
```

### Step 3: Link Your Supabase Project

```bash
supabase link --project-ref kmuoqkcxguafxulqlbmi
```

This connects your local project to the Supabase project.

### Step 4: Deploy the Edge Function

```bash
supabase functions deploy test-broker-connection
```

Or with debug mode for more detailed output:

```bash
supabase functions deploy test-broker-connection --debug
```

### Step 5: Verify Deployment

After deployment, check the logs:

```bash
supabase functions logs test-broker-connection
```

## Expected Output:

If successful, you should see:
```
Deploying function test-broker-connection...
Function test-broker-connection deployed successfully
```

## Troubleshooting:

### If login fails:
- Make sure you're logged into Supabase dashboard in your browser
- Try clearing browser cache and cookies for supabase.com

### If link fails:
- Verify project ref: `kmuoqkcxguafxulqlbmi`
- Make sure you have access to the project

### If deployment fails:
- Check that the function code is correct
- Verify secrets are set in Supabase dashboard
- Check function logs for errors

## After Successful Deployment:

1. ✅ Test the connection in your app
2. ✅ Check Edge Function logs to verify secrets are being read
3. ✅ Test MT5 connection with actual credentials







