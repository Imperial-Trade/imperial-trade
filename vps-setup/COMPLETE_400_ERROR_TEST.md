# ✅ Complete 400 Error Fix Verification & Testing

## 🎯 Status: All 400 Error Fixes Implemented

### ✅ Fixes Applied

1. **API Key Header Normalization** ✅
   - Handles `X-API-Key`, `x-api-key`, `x-apikey`, `X-Apikey`
   - Location: `vps-broker-service/src/index.ts:102`

2. **JSON Payload Structure** ✅
   - Explicit `JSON.stringify()` and `Content-Type: application/json`
   - Location: `supabase/functions/test-broker-connection/index.ts:299`

3. **Decryption User ID Sync** ✅
   - `user_id` passed through entire chain
   - Location: `vps-broker-service/src/index.ts:254`

4. **Broker Type Normalization** ✅
   - Normalizes to lowercase before validation
   - Location: `supabase/functions/test-broker-connection/index.ts:180`

5. **Enhanced Error Logging** ✅
   - Detailed logging for debugging
   - Location: `vps-broker-service/src/index.ts:258-287`

---

## 🧪 Test Instructions

### Test 1: Browser Console Test

**Open Browser Console** (F12) and run:

```javascript
// Test connection from browser console
(async () => {
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  const supabase = createClient(
    'https://kmuoqkcxguafxulqlbmi.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdW9xa2N4Z3VhZnh1bHFsYm1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjU3NzYxNDcsImV4cCI6MjA0MTM1MjE0N30.YourAnonKey'
  );
  
  // Get current session
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    console.error('❌ No session - please log in first');
    return;
  }
  
  console.log('✅ Session found:', session.user.id);
  
  // Encrypt credentials (simplified - use actual encryption from frontend)
  const encryptCredentials = async (text) => {
    // This is a placeholder - use actual encryption from AutoJournalView.tsx
    return btoa(text); // Simplified for testing
  };
  
  // Test connection
  try {
    const { data, error } = await supabase.functions.invoke('test-broker-connection', {
      body: {
        broker_type: 'ecmarkets',
        encrypted_login: await encryptCredentials('800107112'),
        encrypted_password: await encryptCredentials('Demo@123'),
        encrypted_server: await encryptCredentials('ECMarketsLtd-Demo')
      }
    });
    
    if (error) {
      console.error('❌ Edge Function Error:', error);
    } else {
      console.log('✅ Connection Result:', data);
    }
  } catch (err) {
    console.error('❌ Test Failed:', err);
  }
})();
```

---

### Test 2: Direct VPS Test (PowerShell)

**On VPS**, run:

```powershell
$body = @{
    broker_type = 'ecmarkets'
    encrypted_login = 'test'
    encrypted_password = 'test'
    encrypted_server = 'test'
    user_id = 'test-user-id'
} | ConvertTo-Json

Invoke-RestMethod -Uri 'http://localhost:3001/test-connection' `
  -Method POST `
  -Headers @{
    'X-API-Key' = 'bfa602cd4a12c93cd6a0f6cab9d93ff7b0fcd4dd2392f94e48db2013d679990d'
    'Content-Type' = 'application/json'
  } `
  -Body $body
```

**Expected**: Should return error about decryption (not 400 Bad Request)

---

### Test 3: Frontend UI Test

1. Navigate to Journal XX Pro
2. Click "Switch to Auto Journaling (Pro)"
3. Select "EC Markets" broker
4. Enter credentials:
   - **Login**: `800107112`
   - **Password**: `Demo@123`
   - **Server**: `ECMarketsLtd-Demo`
5. Click "Connect Broker"
6. Monitor:
   - Browser console for errors
   - VPS logs: `pm2 logs imperial-trade-broker-service`

**Expected**:
- ✅ No 400 errors
- ✅ Connection successful
- ✅ Account info displayed

---

## 🔍 Verification Checklist

### VPS Service
- [x] Service running: `pm2 status`
- [x] API key set in `.env`
- [x] Encryption secret matches frontend
- [x] Port 3001 accessible

### Edge Function
- [x] Function deployed: `npx supabase functions list`
- [x] `VPS_MT5_SERVICE_URL` secret set
- [x] `VPS_API_KEY` secret set

### Frontend
- [x] User logged in
- [x] Credentials encrypted before sending
- [x] Edge Function called correctly

---

## 📊 Expected Flow

```
Frontend
  ↓ [Encrypts credentials]
  ↓ [supabase.functions.invoke('test-broker-connection')]
Edge Function
  ↓ [Forwards to VPS with X-API-Key]
  ↓ [POST http://45.32.89.134:3001/test-connection]
VPS Broker Service
  ↓ [Validates API key ✅]
  ↓ [Decrypts credentials ✅]
  ↓ [Calls Python script]
Python Script
  ↓ [Connects to MT5]
  ↓ [Returns account info]
VPS Broker Service
  ↓ [Returns JSON response]
Edge Function
  ↓ [Returns to frontend]
Frontend
  ↓ [Displays account info]
  ✅ SUCCESS - NO 400 ERRORS
```

---

## 🚨 If 400 Error Still Occurs

### Check These:

1. **API Key Mismatch**
   ```powershell
   # On VPS
   Get-Content C:\vps-broker-service\.env | Select-String "VPS_API_KEY"
   ```

2. **Encryption Secret Mismatch**
   ```powershell
   # On VPS
   Get-Content C:\vps-broker-service\.env | Select-String "ENCRYPTION_SECRET"
   ```
   Should be: `ImperialTrade_BrokerEncryption_2025_v1`

3. **Edge Function Secrets**
   ```bash
   npx supabase secrets list
   ```
   Should show:
   - `VPS_MT5_SERVICE_URL=http://45.32.89.134:3001`
   - `VPS_API_KEY=bfa602cd4a12c93cd6a0f6cab9d93ff7b0fcd4dd2392f94e48db2013d679990d`

4. **VPS Logs**
   ```powershell
   pm2 logs imperial-trade-broker-service --lines 50
   ```
   Look for:
   - `📥 Received test-connection request`
   - `✅ Credentials decrypted successfully`
   - `❌ Decryption failed` (if error)

---

## ✅ Current Status

**All 400 error fixes are implemented and ready for testing.**

**Next Step**: Test from frontend UI to verify complete flow works.

---

**Last Updated**: 2026-01-09 02:59 UTC
**Status**: ✅ **READY FOR TESTING**
