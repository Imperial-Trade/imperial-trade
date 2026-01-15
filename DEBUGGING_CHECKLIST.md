# 🔍 Debugging Checklist - Edge Function → VPS → MT5 Connection

## ✅ Completed Steps

1. **✅ VPS Network Connectivity**
   - VPS is listening on `0.0.0.0:3001` ✅
   - Windows Firewall allows port 3001 ✅
   - External access confirmed: `http://45.32.89.134:3001/health` ✅

2. **✅ Supabase Secrets**
   - `VPS_MT5_SERVICE_URL` = `http://45.32.89.134:3001` ✅
   - `VPS_API_KEY` = configured ✅

3. **✅ Edge Function Enhanced**
   - Now passes through actual VPS error messages ✅
   - Better logging added ✅
   - Deployed successfully ✅

## 🔍 Next Steps to Debug

### Step 1: Verify MT5 Terminal is Running on VPS

**Action:** Connect to VPS and check:
1. Is Generic MT5 Terminal running?
2. Is it logged in?
3. Is the terminal path correct: `C:\Program Files\MetaTrader 5\terminal64.exe`

**Check on VPS:**
```powershell
# Check if MT5 process is running
Get-Process | Where-Object {$_.ProcessName -like '*terminal*'}

# Check if terminal64.exe exists
Test-Path "C:\Program Files\MetaTrader 5\terminal64.exe"

# Check directory contents
Get-ChildItem "C:\Program Files" -Recurse -Filter "*terminal*.exe" -ErrorAction SilentlyContinue
```

### Step 2: Monitor Real-Time Logs During Connection Test

**On VPS:**
```bash
pm2 logs imperial-trade-broker-service --lines 0
```

**On Your Machine:**
```bash
npx supabase functions logs test-broker-connection --project-ref kmuoqkcxguafxulqlbmi --follow
```

**Then test from frontend** - you'll see:
- Edge Function logs showing what it's sending
- VPS logs showing what it receives
- Python script output showing MT5 connection attempts
- Exact error messages from MT5

### Step 3: Test with Direct VPS Call (Bypass Edge Function)

Create a test script to call VPS directly with test credentials:

```bash
curl -X POST http://45.32.89.134:3001/test-connection \
  -H "Content-Type: application/json" \
  -H "X-API-Key: bfa602cd4a12c93cd6a0f6cab9d93ff7b0fcd4dd2392f94e48db2013d679990d" \
  -d '{
    "broker_type": "xs",
    "encrypted_login": "test",
    "encrypted_password": "test",
    "encrypted_server": "test",
    "user_id": "test-user-id"
  }'
```

This will show if:
- VPS endpoint is working
- Encryption/decryption is working
- MT5 connection logic is working

### Step 4: Check Common MT5 Issues

1. **MT5 Not Initialized**
   - Error: "MT5 initialization failed"
   - Fix: Ensure Generic MT5 Terminal is open and logged in on VPS

2. **Wrong Server Name**
   - Error: "Invalid account" or "Login failed"
   - Fix: Server name must match EXACTLY (case-sensitive) from MT5 terminal

3. **Invalid Credentials**
   - Error: "Invalid password" or "Invalid account"
   - Fix: Verify credentials are correct

4. **MT5 Terminal Path Wrong**
   - Error: "MT5 initialization failed: file not found"
   - Fix: Update path in Python script if MT5 is installed elsewhere

## 📋 Expected VPS Log Output

When working correctly, you should see:
```
📥 Received test-connection request: { broker_type: 'xs', ... }
🔓 Attempting to decrypt credentials...
✅ Credentials decrypted successfully: { login: '12345', server: 'XS.com-Demo', ... }
🔌 Testing MT5 connection...
[MT5 Client] Attempt 1/1: Trying server "XS.com-Demo"
✅ Connection successful
```

## 🔧 Current VPS Error Patterns

From logs, we see:
- ❌ "Missing required fields" - Payload format issue (being addressed)
- ❌ Python script timeouts - MT5 connection taking too long
- ❌ Missing environment variables - Auto-sync service (not critical for connection test)

## 📝 Test from Frontend Now

1. **Open Journal XX Pro app**
2. **Go to Auto Journal View**
3. **Click "Connect Broker"**
4. **Enter valid MT5 demo credentials:**
   - Broker: XS.com (or any broker)
   - Login: [Valid demo account number]
   - Password: [Demo account password]
   - Server: [Exact server name from MT5 terminal]
5. **Click "Connect"**

**Watch the logs:**
- Edge Function logs will show the request
- VPS logs will show the MT5 connection attempt
- Frontend will show the actual error message (now with VPS details)

## 🎯 What the Enhanced Error Messages Will Show

The Edge Function now returns detailed error messages from VPS:

**Example Errors:**
- ✅ "Invalid account. Login ID 12345 not found on server 'XS.com-Demo'..."
- ✅ "MT5 initialization failed: Generic MT5 must be running..."
- ✅ "Login failed: Invalid password for login 12345..."
- ✅ "VPS rejected request: Missing required fields..." (payload issue)

These will help pinpoint the exact issue!

---

**Ready to test!** The enhanced error messages will now show exactly what's happening at each step.






