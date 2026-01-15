# 🚀 Run MT5 Test on VPS

## 📋 **VPS Details:**
- **IP:** 209.222.12.247
- **Username:** root
- **SSH Key:** ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEn5mXQUF0SEaMhW47DpTrCBxqI8+yVTR+vIf6mLgfso

---

## 🔧 **Method 1: Run Individual Commands**

### **Step 1: SSH into VPS**
```bash
ssh root@209.222.12.247
```

### **Step 2: Test Connection**
```bash
cd /root/imperial-factory/vps-broker-service/python && \
python3 test_connection.py '{"login": "800107112", "password": "Demo@123", "server": "ECMarkets-MT5-Demo", "portable_mode": false}'
```

### **Step 3: Test Trade Fetching**
```bash
cd /root/imperial-factory/vps-broker-service/python && \
python3 fetch_trades.py '{"login": "800107112", "password": "Demo@123", "server": "ECMarkets-MT5-Demo", "portable_mode": false}'
```

---

## 🔧 **Method 2: Copy Test Script to VPS**

### **Option A: Copy script file to VPS**

1. **Copy the script to VPS:**
```bash
# From your local machine, copy the script:
scp test_mt5_vps.sh root@209.222.12.247:/root/test_mt5_vps.sh
```

2. **SSH into VPS:**
```bash
ssh root@209.222.12.247
```

3. **Run the script:**
```bash
chmod +x /root/test_mt5_vps.sh
/root/test_mt5_vps.sh
```

### **Option B: Create script directly on VPS**

1. **SSH into VPS:**
```bash
ssh root@209.222.12.247
```

2. **Create the script:**
```bash
cat > /root/test_mt5_vps.sh << 'EOF'
#!/bin/bash
cd /root/imperial-factory/vps-broker-service/python

echo "🧪 Testing MT5 Connection (Demo Account)..."
python3 test_connection.py '{"login": "800107112", "password": "Demo@123", "server": "ECMarkets-MT5-Demo", "portable_mode": false}'

echo ""
echo "🧪 Testing Trade Fetching (Demo Account)..."
python3 fetch_trades.py '{"login": "800107112", "password": "Demo@123", "server": "ECMarkets-MT5-Demo", "portable_mode": false}'
EOF

chmod +x /root/test_mt5_vps.sh
/root/test_mt5_vps.sh
```

---

## 📊 **What to Look For:**

### **✅ Successful Connection Test:**
```json
{
  "connected": true,
  "account_info": {
    "login": 800107112,
    "balance": 0.0,
    "server": "ECMarkets-MT5-Demo"
  },
  "server_used": "ECMarkets-MT5-Demo"
}
```

### **✅ Successful Trade Fetch:**
```json
{
  "trades": [...],
  "account_balance": 0.0
}
```

---

## ⚠️ **Quick Commands (Copy/Paste Ready):**

**SSH and test in one go:**
```bash
ssh root@209.222.12.247 "cd /root/imperial-factory/vps-broker-service/python && python3 test_connection.py '{\"login\": \"800107112\", \"password\": \"Demo@123\", \"server\": \"ECMarkets-MT5-Demo\", \"portable_mode\": false}'"
```

---

## 🎯 **After Running Tests:**

1. ✅ Share the output with me
2. ✅ Check if connection succeeds
3. ✅ Check if trades are fetched
4. ✅ Verify trade count matches expectations
