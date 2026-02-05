# Python Files Missing on VPS - Solution

## Problem
The `test_connection.py` file doesn't exist on your Ubuntu VPS, but the Node.js service needs it.

## Where Node.js Service Expects the Files

The Node.js service (running from compiled JavaScript) expects Python files at:
```
/path/to/vps-broker-service/python/test_connection.py
/path/to/vps-broker-service/python/fetch_trades.py
```

The path is relative: `../python/test_connection.py` from the compiled `src/` directory.

---

## Solution: Find or Upload Files

### Step 1: Find Where Node.js Service is Running

On your VPS, find where the Node.js service is located:

```bash
# Find the Node.js service process
ps aux | grep node | grep -v grep

# Or find the service directory
pm2 info imperial-trade-broker-service | grep "script path"
```

### Step 2: Check if Python Files Exist

```bash
# From the Node.js service directory, check for Python files
cd /path/to/vps-broker-service
ls -la python/test_connection.py
ls -la python/fetch_trades.py
```

### Step 3: If Files Don't Exist - Upload Them

You need to upload these files from your local machine to the VPS:

**Required Python Files:**
- `vps-broker-service/python/test_connection.py`
- `vps-broker-service/python/fetch_trades.py`
- `vps-broker-service/python/mt5_error_handler.py`

**Upload Method (choose one):**

#### Option A: Using SCP
```bash
# From your local machine
scp vps-broker-service/python/test_connection.py user@209.222.12.247:/path/to/vps-broker-service/python/
scp vps-broker-service/python/fetch_trades.py user@209.222.12.247:/path/to/vps-broker-service/python/
scp vps-broker-service/python/mt5_error_handler.py user@209.222.12.247:/path/to/vps-broker-service/python/
```

#### Option B: Using Git (if repo is on VPS)
```bash
# On VPS
cd /path/to/imperial-trade
git pull
# Then copy files to service directory
cp vps-broker-service/python/*.py /path/to/vps-broker-service/python/
```

#### Option C: Manual Copy-Paste
1. Read the file contents locally
2. Create the file on VPS: `nano /path/to/vps-broker-service/python/test_connection.py`
3. Paste contents and save

---

## Quick Check Commands (Run on VPS)

```bash
# Find Node.js service location
pm2 info imperial-trade-broker-service

# Check if Python directory exists
ls -la /opt/vps-broker-service/python/ 2>/dev/null
ls -la /root/vps-broker-service/python/ 2>/dev/null
ls -la ~/vps-broker-service/python/ 2>/dev/null

# Search for existing Python files
find / -name "test_connection.py" 2>/dev/null | head -5
find / -name "fetch_trades.py" 2>/dev/null | head -5
```

---

**The files exist locally - they just need to be on the VPS!**
