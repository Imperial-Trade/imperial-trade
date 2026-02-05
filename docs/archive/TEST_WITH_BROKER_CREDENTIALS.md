# 🧪 Test with Broker Credentials

## 📋 **Credentials from Photo:**
- **Account:** 800107112
- **Password:** Demo@123
- **Server:** ECMarkets-MT5-Demo
- **Type:** MT5 DEMO-STD

---

## 🚀 **Testing Steps:**

### **1. Stop Current Test Container**

```bash
docker stop test-mt5-worker
docker rm test-mt5-worker
```

### **2. Create launch.ini with Broker Credentials**

```bash
cat > /root/imperial-factory/config/test_launch.ini << 'EOF'
[Common]
Login=800107112
Password=Demo@123
Server=ECMarkets-MT5-Demo
ProxyEnable=0
CertConfirm=1

[Experts]
AllowLiveTrading=1
AllowDllImport=0
Enabled=1
AccountAndConsole=1
WebRequestEnable=1
WebRequestUrl=https://kmuoqkcxguafxulqlbmi.supabase.co

[Chart1]
Symbol=EURUSD
Period=M1
Expert=ImperialSync
EOF
```

### **3. Start Container with Broker Credentials**

```bash
docker run -d --name test-mt5-worker \
  -v /root/imperial-factory/config/test_launch.ini:/mt5/config/launch.ini:ro \
  imperial-mt5-worker
```

### **4. Monitor Connection**

```bash
# Wait for MT5 to start
sleep 15

# Check container status
docker ps -a | grep test-mt5-worker

# Check logs
docker logs test-mt5-worker

# Check for connection messages
docker logs test-mt5-worker 2>&1 | grep -i "connected\|login\|authenticate\|error\|fail" | tail -30

# Check if MT5 is running
docker exec test-mt5-worker ps aux | grep terminal64
```

### **5. Watch Logs in Real-Time**

```bash
# Monitor logs continuously
docker logs -f test-mt5-worker
```
