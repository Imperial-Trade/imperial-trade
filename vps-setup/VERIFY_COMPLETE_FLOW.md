# Complete MT5 Flow Verification Guide

## Flow Architecture

```
Frontend (Browser)
    ↓
    POST /functions/v1/test-broker-connection
    ↓
Edge Function (Supabase)
    ↓
    POST http://VPS_IP:3001/test-connection
    ↓
VPS Broker Service (Node.js)
    ↓
    Python: test_connection.py
    ↓
MT5 Terminal (Generic MT5)
    ↓
    Login & Get Account Info
    ↓
    Return Data
    ↓
VPS Broker Service
    ↓
Edge Function
    ↓
Frontend (Display Success/Error)
```

## Current Status

### ✅ Components Verified

1. **MT5 Terminal**: Running (PID: varies)
   - Generic MT5 must be running
   - Must be logged in manually at least once
   - Algorithmic Trading must be enabled

2. **VPS Broker Service**: Running on port 3001
   - Endpoint: `POST /test-connection`
   - Requires: `X-API-Key` header
   - Accepts: `encrypted_login`, `encrypted_password`, `encrypted_server`, `user_id`, `broker_type`

3. **Edge Function**: `test-broker-connection`
   - Calls VPS at: `VPS_MT5_SERVICE_URL/test-connection`
   - Encrypts credentials if needed
   - Returns: `{ connected: true/false, account_info: {...} }`

4. **Frontend**: `BrokerLoginForm.tsx`
   - Calls: `supabase.functions.invoke('test-broker-connection', {...})`
   - Encrypts credentials before sending
   - Displays success/error message

## Testing Steps

### Step 1: Verify MT5 is Ready
```powershell
# On VPS
Get-Process -Name "terminal64"
# Should show Generic MT5 running
```

### Step 2: Test Python Script Directly
```powershell
# On VPS
cd C:\vps-broker-service\python
python test_connection.py '{"login":"800107112","password":"YOUR_PASSWORD","server":"ECMarketsLtd-Demo"}'
# Should return: {"connected": true, "account_info": {...}}
```

### Step 3: Test Broker Service Endpoint
```powershell
# On VPS - Get API key from .env
$apiKey = (Get-Content C:\vps-broker-service\.env | Select-String "VPS_API_KEY=").ToString().Split("=")[1]

# Test with encrypted credentials (simplified)
$body = @{
    broker_type = "ecmarkets"
    encrypted_login = "ENCRYPTED_LOGIN"
    encrypted_password = "ENCRYPTED_PASSWORD"
    encrypted_server = "ENCRYPTED_SERVER"
    user_id = "test-user-id"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3001/test-connection" `
    -Method POST `
    -ContentType "application/json" `
    -Headers @{ "X-API-Key" = $apiKey } `
    -Body $body
```

### Step 4: Test from Frontend
1. Open Journal XX Pro in browser
2. Navigate to broker connection settings
3. Enter EC Markets Demo credentials:
   - Login: 800107112
   - Password: (your password)
   - Server: ECMarketsLtd-Demo
4. Click "Test Connection"
5. Check browser console for logs
6. Should see success message with account info

## Expected Data Flow

### Request Flow
1. **Frontend** encrypts credentials using user_id + secret
2. **Edge Function** receives encrypted credentials
3. **Edge Function** forwards to VPS with `X-API-Key`
4. **VPS Broker Service** decrypts credentials
5. **VPS Broker Service** calls Python script
6. **Python Script** initializes MT5 and logs in
7. **MT5** authenticates and returns account info

### Response Flow
1. **MT5** returns account_info (login, balance, server, etc.)
2. **Python Script** returns JSON with account_info
3. **VPS Broker Service** returns JSON to Edge Function
4. **Edge Function** returns JSON to Frontend
5. **Frontend** displays success/error message

## Troubleshooting

### Issue: "MT5 initialization failed"
- **Solution**: Ensure Generic MT5 is running and fully initialized
- **Action**: Log in to Generic MT5 manually once, keep it open

### Issue: "Login timeout after 30 seconds"
- **Solution**: Check for MT5 popups, verify server name, check network
- **Action**: Close all MT5 popups, verify server name matches exactly

### Issue: "Failed to decrypt credentials"
- **Solution**: Verify encryption secret matches between frontend and VPS
- **Action**: Check ENCRYPTION_SECRET in Edge Function and VPS

### Issue: "Invalid API key"
- **Solution**: Verify VPS_API_KEY matches between Edge Function and VPS .env
- **Action**: Check Supabase secrets and VPS .env file

### Issue: "Connection test failed" from frontend
- **Solution**: Check Edge Function logs in Supabase dashboard
- **Action**: Verify VPS_MT5_SERVICE_URL and VPS_API_KEY are set in Supabase secrets

## Success Indicators

✅ **MT5 Connection Successful**:
- Python script returns `{"connected": true}`
- Account info includes: login, server, balance
- Connection time < 30 seconds

✅ **Broker Service Working**:
- Health endpoint returns `{"status": "ok"}`
- Test-connection endpoint returns account_info
- Logs show successful decryption and connection

✅ **Edge Function Working**:
- Returns `{ connected: true, account_info: {...} }`
- No timeout errors
- Proper error messages if connection fails

✅ **Frontend Working**:
- Shows success message with account details
- Displays account balance and server name
- Saves connection to database

## Next Steps After Verification

1. Test actual trade fetching: `POST /fetch-trades`
2. Test auto-sync: Verify trades sync automatically
3. Test multiple broker accounts: XS, PU Prime, EC Markets
4. Monitor logs: Check for any errors or timeouts
5. Verify data persistence: Check database for saved connections

