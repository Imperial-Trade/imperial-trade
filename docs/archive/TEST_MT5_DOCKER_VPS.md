# 🧪 Test MT5 in Docker on VPS (Manual Test)

## 🎯 **Goal:**
Test MT5 connection directly in Docker container without frontend.

---

## 📋 **Prerequisites:**

1. ✅ Docker is running
2. ✅ `imperial-mt5-worker` image exists
3. ✅ MT5 files are in the image
4. ✅ You have MT5 credentials to test

---

## 🔧 **Step-by-Step Manual Test:**

### **Step 1: Create Test launch.ini File**

On VPS, create a test configuration file:

```bash
# Create config directory if it doesn't exist
mkdir -p /root/imperial-factory/config

# Create test launch.ini (REPLACE with your test credentials)
cat > /root/imperial-factory/config/test_launch.ini << 'EOF'
[Common]
Login=YOUR_LOGIN_HERE
Password=YOUR_PASSWORD_HERE
Server=YOUR_SERVER_HERE
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

**⚠️ Replace:**
- `YOUR_LOGIN_HERE` - Your MT5 login number
- `YOUR_PASSWORD_HERE` - Your MT5 password
- `YOUR_SERVER_HERE` - Your MT5 server name (e.g., `ECMarkets-MT5-Demo`)

---

### **Step 2: Run Container Manually**

```bash
docker run -d \
  --name test-mt5-worker \
  -v /root/imperial-factory/config/test_launch.ini:/mt5/config/launch.ini:ro \
  imperial-mt5-worker
```

**This will:**
- Start container in background (`-d`)
- Mount the launch.ini file
- Use the `imperial-mt5-worker` image

---

### **Step 3: Check Container Logs**

```bash
# Watch logs in real-time
docker logs -f test-mt5-worker
```

**Look for:**
- ✅ MT5 starting successfully
- ✅ Connection to broker
- ✅ EA loading (`ImperialSync`)
- ✅ WebRequest to Supabase
- ❌ Any errors (connection failed, wrong credentials, etc.)

**Press `Ctrl+C` to stop watching logs**

---

### **Step 4: Check Container Status**

```bash
# Check if container is running
docker ps | grep test-mt5-worker

# Check container logs (last 50 lines)
docker logs --tail 50 test-mt5-worker

# Check if container exited
docker ps -a | grep test-mt5-worker
```

---

### **Step 5: Check Database (Optional)**

If MT5 connects, you should see:
- Updates to `broker_connections` table (if using real connection ID)
- Trade data in `trade_journal_entries` (if EA syncs trades)
- Heartbeat pings via `mt5-sync` Edge Function

---

### **Step 6: Cleanup Test Container**

```bash
# Stop container
docker stop test-mt5-worker

# Remove container
docker rm test-mt5-worker

# Optional: Remove test launch.ini
rm /root/imperial-factory/config/test_launch.ini
```

---

## 🔍 **Expected Results:**

### **✅ Success Indicators:**
- Container runs without immediately crashing
- Logs show MT5 terminal starting
- Connection to broker established
- EA (`ImperialSync`) loads on chart
- WebRequest to Supabase succeeds
- Heartbeat pings appear in database

### **❌ Error Indicators:**
- Container exits immediately
- Connection failed errors
- Wrong credentials errors
- MT5 terminal crash
- EA fails to load

---

## 📊 **Quick Test Script (All-in-One):**

```bash
#!/bin/bash
# Quick MT5 Docker Test Script

LOGIN="YOUR_LOGIN_HERE"
PASSWORD="YOUR_PASSWORD_HERE"
SERVER="YOUR_SERVER_HERE"

# Create launch.ini
mkdir -p /root/imperial-factory/config
cat > /root/imperial-factory/config/test_launch.ini << EOF
[Common]
Login=${LOGIN}
Password=${PASSWORD}
Server=${SERVER}
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

# Clean up old test container
docker stop test-mt5-worker 2>/dev/null
docker rm test-mt5-worker 2>/dev/null

# Run container
echo "🚀 Starting test container..."
docker run -d --name test-mt5-worker \
  -v /root/imperial-factory/config/test_launch.ini:/mt5/config/launch.ini:ro \
  imperial-mt5-worker

# Wait a bit
sleep 5

# Show logs
echo "📋 Container logs:"
docker logs test-mt5-worker

# Check status
echo ""
echo "📊 Container status:"
docker ps -a | grep test-mt5-worker
```

**Save this as `test-mt5-docker.sh`, make it executable (`chmod +x test-mt5-docker.sh`), edit credentials, and run it!**

---

**Run these commands on VPS and share the output - I'll help diagnose any issues!**
