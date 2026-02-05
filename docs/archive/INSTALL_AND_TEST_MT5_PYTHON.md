# 🔧 Install MetaTrader5 Python Library and Test

## 📋 **Steps:**

### **Step 1: Install MetaTrader5 Python Library**

Run this on your VPS:

```bash
pip3 install MetaTrader5
```

If `pip3` is not found, install pip first:

```bash
apt-get update && apt-get install -y python3-pip
pip3 install MetaTrader5
```

### **Step 2: Verify Installation**

Check that MetaTrader5 is installed:

```bash
python3 -c "import MetaTrader5; print('✅ MetaTrader5 version:', MetaTrader5.__version__)"
```

### **Step 3: Test Connection**

Once installed, test the connection:

```bash
cd /root/imperial-factory/broker-service/python && \
python3 test_connection.py '{"login": "800107112", "password": "Demo@123", "server": "ECMarkets-MT5-Demo", "portable_mode": false}'
```

### **Step 4: Test Trade Fetching**

If connection succeeds, test trade fetching:

```bash
cd /root/imperial-factory/broker-service/python && \
python3 fetch_trades.py '{"login": "800107112", "password": "Demo@123", "server": "ECMarkets-MT5-Demo", "portable_mode": false}'
```

---

## ✅ **Expected Results:**

### **Connection Test:**
Should return JSON with `"connected": true` and account info.

### **Trade Fetch Test:**
Should return JSON with `"trades"` array (may be empty if account has no trading history).

---

## 🎯 **After Successful Tests:**

Once Python tests succeed, we'll know:
1. ✅ Credentials work
2. ✅ MT5 connection is possible
3. ✅ Trade fetching works
4. ✅ Ready to test via frontend/Docker containers
