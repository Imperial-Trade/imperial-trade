# Quick MT5 Test on VPS - Copy & Paste Commands

Since you're now logged into the VPS, here are the exact commands to test MT5 connection:

## Step 1: Find the Script Location

```bash
find / -name "test_connection.py" 2>/dev/null | head -5
```

This will show you where the test script is located.

## Step 2: Navigate to That Directory

```bash
cd /path/from/step1
```

For example, if it shows `/root/vps-broker-service/python/test_connection.py`, then:
```bash
cd /root/vps-broker-service
```

## Step 3: Test MT5 Connection

```bash
python3 python/test_connection.py '{"login":"81071266","password":"Imperial@2026","server":"ECMarkets-MT5-Live01"}'
```

## Expected Output

### ✅ SUCCESS:
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

### ❌ FAILURE:
```json
{
  "connected": false,
  "error": "MT5 initialization/login failed..."
}
```

## Troubleshooting

If you get "command not found" errors:
- Check Python: `python3 --version`
- Check MetaTrader5: `python3 -c "import MetaTrader5"`
- Install if needed: `pip3 install MetaTrader5`

---

**Run these commands and share the output!**
