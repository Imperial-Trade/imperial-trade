# Frontend Connection Test Instructions

## Test 2: Frontend Test from Journal XX Pro

### Prerequisites
1. ✅ All backend services running (verified in Test 1)
2. ✅ Python script test passed with real credentials
3. ✅ User logged into Journal XX Pro

### Steps to Test

1. **Open Journal XX Pro** in your browser
   - URL: `http://localhost:8080` (or your deployed URL)
   - Make sure you're logged in

2. **Navigate to Broker Connection Settings**
   - Go to: Settings → Broker Connections
   - Or: Journal XX Pro → Broker Settings

3. **Select EC Markets Demo**
   - Click on "EC Markets" or "EC Markets Demo" broker

4. **Enter Credentials**
   - **Login**: `800107112`
   - **Password**: `Demo@123`
   - **Server**: `ECMarketsLtd-Demo`

5. **Click "Test Connection" or "Save & Test"**

6. **Expected Results**
   - ✅ Connection succeeds
   - ✅ Success message appears
   - ✅ Account info displays:
     - Account number: 800107112
     - Server: ECMarketsLtd-Demo
     - Balance: (your account balance)
     - Equity: (your account equity)
     - Currency: USD
     - Leverage: 1:100

### What Happens Behind the Scenes

1. **Frontend** encrypts credentials using `encryptCredentials()` function
2. **Frontend** calls Edge Function: `supabase.functions.invoke('test-broker-connection')`
3. **Edge Function** validates user and forwards to VPS
4. **VPS Broker Service** decrypts credentials
5. **Python Script** connects to MT5
6. **MT5** authenticates and returns account info
7. **Data flows back** through the chain
8. **Frontend** displays success with account details

### Troubleshooting

If connection fails:
- Check browser console for errors
- Verify user is logged in
- Check Edge Function logs in Supabase
- Verify VPS broker service is running
- Check MT5 is running on VPS

### Success Indicators

✅ **Success Message**: "Successfully connected to ECMarketsLtd-Demo"
✅ **Account Info Displayed**: Balance, equity, server name visible
✅ **Connection Saved**: Credentials stored in database
✅ **No Errors**: Browser console shows no errors

