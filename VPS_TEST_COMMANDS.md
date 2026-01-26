# Commands to Run on Ubuntu VPS

## Step 1: Find the Python Script

```bash
find / -name "test_connection.py" 2>/dev/null | head -5
```

## Step 2: Navigate to the Directory

```bash
# Use the path from Step 1 (example: /opt/vps-broker-service)
cd /path/from/step1
```

## Step 3: Test MT5 Connection

```bash
python3 python/test_connection.py '{"login":"81071266","password":"Imperial@2026","server":"ECMarkets-MT5-Live01"}'
```

---

## Quick One-Liner (if script is in /opt/vps-broker-service):

```bash
cd /opt/vps-broker-service && python3 python/test_connection.py '{"login":"81071266","password":"Imperial@2026","server":"ECMarkets-MT5-Live01"}'
```

---

## What to Expect

Since MT5 is already running (we saw it in `ps aux`), the Python library should:
- ✅ Auto-detect the running MT5
- ✅ Connect successfully
- ✅ Test credentials

---

**Run Step 1 first to find where the files are!**
