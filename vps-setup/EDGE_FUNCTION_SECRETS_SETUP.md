# Edge Function Secrets Setup

## Issue
The `test-broker-connection` Edge Function is returning a 400 error because the required VPS configuration secrets are not set in Supabase.

## Required Secrets
The Edge Function requires two secrets to be configured in Supabase:

1. **VPS_MT5_SERVICE_URL**: The URL of your VPS broker service
   - Example: `http://45.32.89.134:3001`
   - This should match the URL where your VPS broker service is running

2. **VPS_API_KEY**: The API key for authenticating with the VPS broker service
   - This should match the API key configured in your VPS broker service's `.env` file

## How to Set Secrets in Supabase

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **Edge Functions** → **Secrets** (or **Settings** → **Vault** → **Secrets**)
3. Add the following secrets:
   - **Name**: `VPS_MT5_SERVICE_URL`
     **Value**: `http://45.32.89.134:3001` (or your VPS IP:port)
   - **Name**: `VPS_API_KEY`
     **Value**: Your VPS API key (check your VPS broker service `.env` file)

## Verify Secrets Are Set

After setting the secrets, the Edge Function will:
- Log the secret status at startup
- Attempt to connect to the VPS service
- Return proper error messages if the connection fails

## Testing

Once secrets are configured:
1. Try connecting a broker from the frontend
2. Check the Edge Function logs in Supabase dashboard
3. Verify the connection test succeeds

## Troubleshooting

If you still get errors after setting secrets:
1. Verify the VPS broker service is running on the specified URL
2. Check that the API key matches between Supabase and VPS
3. Ensure the VPS is accessible from the internet (not blocked by firewall)
4. Check Edge Function logs for detailed error messages
