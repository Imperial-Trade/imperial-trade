# VPS MT5 Connection Test - Step by Step

## ⚠️ You Need to Run This ON THE VPS

I cannot SSH into your VPS from here. You need to run these commands **directly on your Ubuntu VPS**.

---

## Step-by-Step Instructions

### 1. SSH into Your VPS

```bash
ssh user@209.222.12.247
# (Replace 'user' with your actual VPS username)
```

### 2. Find the vps-broker-service Directory

```bash
# Try these common locations:
ls -la /root/vps-broker-service
ls -la /home/*/vps-broker-service
ls -la /opt/vps-broker-service

# Or search for it:
find / -name "test_connection.py" 2>/dev/null | head -5
```

### 3. Navigate to the Directory

```bash
cd /path/to/vps-broker-service
# (Use the path you found in step 2)
```

### 4. Test MT5 Connection

```bash
python3 python/test_connection.py '{"login":"81071266","password":"Imperial@2026","server":"ECMarkets-MT5-Live01"}'
```

---

## What to Look For

### ✅ SUCCESS Looks Like:
```json
{
  "connected": true,
  "account_info": {
    "login": 81071266,
    "server": "ECMarkets-MT5-Live01",
    "balance": <amount>
  }
}
```

### ❌ FAILURE Looks Like:
```json
{
  "connected": false,
  "error": "MT5 initialization/login failed...",
  "error_code": 10004
}
```

---

## Common Issues

### Issue 1: "Python script not found"
**Solution**: Find the correct path:
```bash
find / -name "test_connection.py" 2>/dev/null
```

### Issue 2: "MetaTrader5 module not found"
**Solution**: Install it:
```bash
pip3 install MetaTrader5
```

### Issue 3: "MT5 terminal not found"
**Solution**: Check if MT5_BrokerService is installed:
```bash
ls -la /path/to/MT5_BrokerService/terminal64.exe
```

### Issue 4: "Connection timeout"
**Solution**: 
- Check if MT5 terminal is running
- Verify credentials are correct
- Check server name matches exactly

---

## After Testing

**If SUCCESS**: ✅ Credentials work! Proceed to test Edge Functions.

**If FAILURE**: ❌ Fix the MT5 connection issue first before testing Edge Functions.

---

**Please run this test on your VPS and share the results!**
