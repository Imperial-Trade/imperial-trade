# Find Files and Test on Ubuntu VPS

## Step 1: Find the vps-broker-service Directory

Run these commands on your VPS to find where the files are:

```bash
# Search for the test script
find / -name "test_connection.py" 2>/dev/null | head -5

# Or search for vps-broker-service directory
find / -type d -name "vps-broker-service" 2>/dev/null | head -5

# Check common locations
ls -la /opt/vps-broker-service 2>/dev/null
ls -la /home/*/vps-broker-service 2>/dev/null
ls -la ~/vps-broker-service 2>/dev/null
```

## Step 2: Navigate to the Directory

Once you find it, navigate there:

```bash
cd /path/to/vps-broker-service
# (use the actual path from Step 1)
```

## Step 3: Test MT5 Connection

```bash
python3 python/test_connection.py '{"login":"81071266","password":"Imperial@2026","server":"ECMarkets-MT5-Live01"}'
```

---

## Quick Commands to Run (Copy-Paste All):

```bash
# Find the script
find / -name "test_connection.py" 2>/dev/null | head -3

# Once you find it, note the directory path, then:
# cd /path/from/above
# python3 python/test_connection.py '{"login":"81071266","password":"Imperial@2026","server":"ECMarkets-MT5-Live01"}'
```
