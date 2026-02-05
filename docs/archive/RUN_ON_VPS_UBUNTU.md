# Test MT5 Connection on Ubuntu VPS

## ⚠️ IMPORTANT: Run This ON THE VPS

This test verifies that MT5 credentials work **directly from the Ubuntu VPS**, not from Supabase.

---

## Quick Test (Copy & Paste on VPS)

### Option 1: Using the Test Script

```bash
# SSH into your VPS
ssh user@209.222.12.247

# Navigate to project directory (or wherever vps-broker-service is)
cd /path/to/imperial-trade

# Make script executable
chmod +x test-mt5-on-vps.sh

# Run the test
./test-mt5-on-vps.sh
```

### Option 2: Direct Python Test

```bash
# SSH into your VPS
ssh user@209.222.12.247

# Navigate to vps-broker-service directory
cd /path/to/vps-broker-service

# Run Python test directly
python3 python/test_connection.py '{"login":"81071266","password":"Imperial@2026","server":"ECMarkets-MT5-Live01"}'
```

---

## Expected Output (Success)

```json
{
  "connected": true,
  "account_info": {
    "login": 81071266,
    "name": "Your Account Name",
    "server": "ECMarkets-MT5-Live01",
    "balance": 1000.0,
    "equity": 1000.0,
    "currency": "USD"
  },
  "server_used": "ECMarkets-MT5-Live01",
  "connection_time_ms": 2500
}
```

---

## Expected Output (Failure)

```json
{
  "connected": false,
  "error": "MT5 initialization/login failed...",
  "error_code": 10004,
  "error_details": "..."
}
```

---

## Troubleshooting

### If Python Script Not Found:
```bash
# Find the script
find / -name "test_connection.py" 2>/dev/null

# Or check common locations
ls -la /root/vps-broker-service/python/test_connection.py
ls -la /home/*/vps-broker-service/python/test_connection.py
```

### If MetaTrader5 Library Missing:
```bash
pip3 install MetaTrader5
```

### If MT5 Terminal Not Running:
```bash
# Check if MT5 is running
ps aux | grep terminal64

# Check if MT5_BrokerService exists
ls -la /path/to/MT5_BrokerService/terminal64.exe
```

---

## What This Test Verifies

✅ MT5 Python library can connect to MT5 terminal  
✅ Credentials are correct  
✅ Server name is correct  
✅ MT5 terminal is accessible from Python  
✅ Network connectivity to broker server  

---

## After This Test

If this test **succeeds**, then:
- ✅ Credentials are valid
- ✅ MT5 connection works from VPS
- ✅ Next: Test Edge Functions (they should work)

If this test **fails**, then:
- ❌ Fix MT5 connection issues first
- ❌ Check credentials
- ❌ Check MT5 terminal is running
- ❌ Check server name

---

**Run this test ON THE VPS to verify credentials work directly!**
