# 🔍 Connection Verification Report

## ❌ **CRITICAL ISSUES FOUND:**

### **1. PORT MISMATCH - CRITICAL ⚠️**

**Problem:**
- ❌ Edge Function uses port **3000** (default fallback)
- ✅ VPS Broker Service runs on port **3001** (to avoid conflict with price feeder)
- **Result**: Edge Function cannot connect to VPS service!

**Files Affected:**
- `supabase/functions/sync-broker-trades/index.ts` (Line 16)
  ```typescript
  const VPS_MT5_SERVICE_URL = Deno.env.get('VPS_MT5_SERVICE_URL') || 'http://your-vps-ip:3000'
  //                                                                                  ^^^^ WRONG!
  ```

**Fix Required:**
1. Set `VPS_MT5_SERVICE_URL` in Supabase Edge Function secrets:
   - Go to: Supabase Dashboard → Settings → Edge Functions → Secrets
   - Add: `VPS_MT5_SERVICE_URL` = `http://45.32.89.134:3001`
   - Add: `VPS_API_KEY` = (your API key)

2. OR fix default in code:
   ```typescript
   const VPS_MT5_SERVICE_URL = Deno.env.get('VPS_MT5_SERVICE_URL') || 'http://45.32.89.134:3001'
   //                                                                                  ^^^^ CORRECT!
   ```

---

### **2. VPS SERVICE CONFIGURATION**

**Current Configuration (Correct):**
- ✅ VPS Broker Service runs on port **3001** (to avoid conflict with price feeder on 3000)
- ✅ Service binds to `0.0.0.0:3001` (accessible externally)
- ✅ API Key validation enabled

**Files:**
- `vps-broker-service/src/index.ts` (Line 30): `PORT = 3001` ✅
- `vps-broker-service/src/index.ts` (Line 31): `API_KEY = process.env.VPS_API_KEY` ✅

---

### **3. PYTHON SCRIPTS CONFIGURATION**

**MT5 Paths (Correct):**
- ✅ `fetch_trades.py`: Uses Generic MT5 at `C:\Program Files\MetaTrader 5\terminal64.exe`
- ✅ `test_connection.py`: Uses Generic MT5 at `C:\Program Files\MetaTrader 5\terminal64.exe`
- ✅ IPC timeout retries implemented (1s, 2s, 4s exponential backoff)

**Files:**
- `vps-broker-service/python/fetch_trades.py` ✅
- `vps-broker-service/python/test_connection.py` ✅

---

### **4. EDGE FUNCTION CONFIGURATION**

**Environment Variables Required:**
1. `VPS_MT5_SERVICE_URL` - **MUST BE SET** (currently missing or wrong port)
   - Should be: `http://45.32.89.134:3001`
   - Currently defaults to: `http://your-vps-ip:3000` ❌

2. `VPS_API_KEY` - **MUST BE SET**
   - Should match: `VPS_API_KEY` in VPS `.env` file

**Files:**
- `supabase/functions/sync-broker-trades/index.ts` (Line 16, 98) ⚠️
- `supabase/functions/test-broker-connection/index.ts` (Line 23, 24) ✅ (properly checks)

---

## ✅ **WHAT'S CORRECT:**

1. ✅ **VPS Broker Service**: Port 3001 (correct)
2. ✅ **Python Scripts**: MT5 paths are correct (Generic MT5)
3. ✅ **IPC Timeout Handling**: Retries implemented (1s, 2s, 4s)
4. ✅ **API Key Validation**: Middleware implemented
5. ✅ **CORS Configuration**: Allows all origins (correct for Edge Functions)
6. ✅ **Error Handling**: Proper error messages in all scripts

---

## ❌ **WHAT NEEDS FIXING:**

1. ❌ **CRITICAL**: Edge Function `VPS_MT5_SERVICE_URL` must be set to `http://45.32.89.134:3001`
2. ❌ **CRITICAL**: Edge Function `VPS_API_KEY` must match VPS `.env` file
3. ⚠️  **Optional**: Fix default port in code (3000 → 3001)

---

## 🔧 **HOW TO FIX:**

### **Step 1: Set Supabase Edge Function Secrets**

1. Go to: https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/settings/edge-functions
2. Click "Secrets" tab
3. Add these secrets:
   - `VPS_MT5_SERVICE_URL` = `http://45.32.89.134:3001`
   - `VPS_API_KEY` = (same value as in VPS `.env` file)

### **Step 2: Verify VPS Service is Running**

Run on VPS:
```powershell
pm2 list | Select-String "imperial-trade-broker-service"
```

Should show: `online` status

### **Step 3: Test Connection**

Test from Edge Function logs or manually:
```bash
curl -X POST http://45.32.89.134:3001/health \
  -H "X-API-Key: YOUR_API_KEY"
```

Should return: `{"status":"ok","service":"imperial-trade-broker-service",...}`

---

## 📋 **VERIFICATION CHECKLIST:**

- [ ] VPS Broker Service running on port 3001 ✅
- [ ] Generic MT5 installed and running ✅
- [ ] Python scripts in place ✅
- [ ] VPS `.env` file configured with `VPS_API_KEY` ✅
- [ ] Supabase Edge Function secret `VPS_MT5_SERVICE_URL` = `http://45.32.89.134:3001` ❌ **FIX THIS!**
- [ ] Supabase Edge Function secret `VPS_API_KEY` set ❌ **FIX THIS!**
- [ ] Windows Firewall allows port 3001 ✅
- [ ] Vultr firewall allows port 3001 ✅

---

## 📊 **SUMMARY:**

**Files are correct** ✅:
- Python scripts: Correct MT5 paths
- TypeScript code: Correct port (3001)
- Error handling: Properly implemented

**Connections need fixing** ❌:
- Edge Function secret `VPS_MT5_SERVICE_URL`: Missing or wrong port (3000 instead of 3001)
- Edge Function secret `VPS_API_KEY`: Must match VPS `.env` file

**Status**: ⚠️ **Configuration issue - needs Supabase secrets update**

---

**Last Updated**: 2025-01-07



