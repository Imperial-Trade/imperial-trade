# 🚀 Next Steps - All Command Prompts

## 📋 **Current Status:**
✅ Docker container is running and stable
✅ MT5 is running successfully
✅ All tests passed

---

## 🎯 **OPTION A: Verify Current Test Setup**

### **1. Check Current Test Configuration**

```bash
# Check what credentials are in test_launch.ini
cat /root/imperial-factory/config/test_launch.ini

# Check if config directory exists
ls -la /root/imperial-factory/config/

# Check container mounts
docker inspect test-mt5-worker | grep -A 10 "Mounts"
```

### **2. Check MT5 Connection Status**

```bash
# Check recent logs for connection messages
docker logs test-mt5-worker | tail -100

# Check for connection-related messages
docker logs test-mt5-worker 2>&1 | grep -i "connection\|connected\|login\|authenticate" | tail -20

# Check for Expert Advisor messages
docker logs test-mt5-worker 2>&1 | grep -i "expert\|imperial\|sync" | tail -20
```

### **3. Check Expert Advisor Files**

```bash
# Check if Expert Advisor exists in container
docker exec test-mt5-worker ls -la /mt5/MQL5/Experts/ 2>/dev/null

# Check MT5 logs directory (if exists)
docker exec test-mt5-worker ls -la /mt5/logs/ 2>/dev/null

# Check MT5 terminal logs
docker exec test-mt5-worker find /mt5 -name "*.log" -type f 2>/dev/null | head -10
```

### **4. Monitor Container in Real-Time**

```bash
# Watch logs in real-time (Ctrl+C to stop)
docker logs -f test-mt5-worker

# Monitor resource usage continuously
docker stats test-mt5-worker
```

---

## 🎯 **OPTION B: Test with Real Broker Credentials**

### **1. Stop Current Test Container**

```bash
# Stop the test container
docker stop test-mt5-worker

# Remove the test container
docker rm test-mt5-worker
```

### **2. Create launch.ini with Real Credentials**

**Replace YOUR_MT5_LOGIN, YOUR_MT5_PASSWORD, YOUR_MT5_SERVER with your actual credentials:**

```bash
cat > /root/imperial-factory/config/test_launch.ini << 'EOF'
[Common]
Login=YOUR_MT5_LOGIN
Password=YOUR_MT5_PASSWORD
Server=YOUR_MT5_SERVER
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

### **3. Start New Container with Real Credentials**

```bash
# Start container with real credentials
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

# Check for connection status
docker logs test-mt5-worker 2>&1 | grep -i "connected\|login\|error\|fail" | tail -30

# Check if MT5 is running
docker exec test-mt5-worker ps aux | grep terminal64

# Monitor logs in real-time
docker logs -f test-mt5-worker
```

---

## 🎯 **OPTION C: Clean Up and Prepare for Production**

### **1. Stop and Remove Test Container**

```bash
# Stop test container
docker stop test-mt5-worker

# Remove test container
docker rm test-mt5-worker

# Verify it's removed
docker ps -a | grep test-mt5-worker
```

### **2. Verify Docker Image is Ready**

```bash
# Check image exists
docker images | grep imperial-mt5-worker

# Check image details
docker inspect imperial-mt5-worker | grep -A 5 "Created\|Size"
```

### **3. Verify Go Brain Configuration**

```bash
# Check Go Brain code (if on VPS)
cd /root/imperial-factory/broker-service/go-brain
grep -n "imperial-mt5-worker" main.go

# Verify Go Brain service is running (if applicable)
# (Commands depend on how Go Brain is deployed)
```

---

## 🎯 **OPTION D: Complete Verification Checklist**

### **Run All Verification Commands:**

```bash
echo "=== 1. Container Status ==="
docker ps -a | grep test-mt5-worker

echo ""
echo "=== 2. MT5 Process Status ==="
docker exec test-mt5-worker ps aux | grep terminal64

echo ""
echo "=== 3. Resource Usage ==="
docker stats test-mt5-worker --no-stream

echo ""
echo "=== 4. Recent Logs (last 50 lines) ==="
docker logs --tail 50 test-mt5-worker

echo ""
echo "=== 5. Error Check ==="
docker logs test-mt5-worker 2>&1 | grep -i "error\|fail" | tail -20

echo ""
echo "=== 6. Connection Status ==="
docker logs test-mt5-worker 2>&1 | grep -i "connected\|login" | tail -20

echo ""
echo "=== 7. Configuration File ==="
cat /root/imperial-factory/config/test_launch.ini 2>/dev/null || echo "File not found"
```

---

## 🎯 **OPTION E: Advanced Diagnostics**

### **1. Check Container Internals**

```bash
# Execute shell inside container
docker exec -it test-mt5-worker /bin/bash

# Once inside container, you can run:
# ls -la /mt5/
# ls -la /mt5/MQL5/Experts/
# ps aux
# exit
```

### **2. Check Wine Environment**

```bash
# Check Wine version
docker exec test-mt5-worker wine --version

# Check Wine prefix
docker exec test-mt5-worker ls -la /root/.wine/

# Check Wine processes
docker exec test-mt5-worker pgrep -a wine
```

### **3. Check Network Connectivity**

```bash
# Check if container can reach internet
docker exec test-mt5-worker ping -c 3 8.8.8.8

# Check DNS resolution
docker exec test-mt5-worker nslookup google.com
```

### **4. Export Logs for Analysis**

```bash
# Export full logs to file
docker logs test-mt5-worker > /tmp/mt5-container-logs.txt

# Export logs with timestamps
docker logs -t test-mt5-worker > /tmp/mt5-container-logs-timestamped.txt

# View exported logs
cat /tmp/mt5-container-logs.txt
```

---

## 🎯 **OPTION F: Production Deployment Commands**

### **1. Verify Image for Production**

```bash
# List all containers using the image
docker ps -a --filter ancestor=imperial-mt5-worker

# Check image size and details
docker images imperial-mt5-worker

# Verify image integrity
docker inspect imperial-mt5-worker
```

### **2. Test Image with Go Brain Pattern**

**Note:** These commands simulate what Go Brain does (you'll need actual connection ID):

```bash
# Example: Create container similar to Go Brain pattern
CONNECTION_ID="test-$(uuidgen 2>/dev/null || echo $(date +%s))"
CONTAINER_NAME="worker_${CONNECTION_ID}"

# Create launch.ini for this connection
mkdir -p /root/imperial-factory/config
cat > /root/imperial-factory/config/launch_${CONNECTION_ID}.ini << 'EOF'
[Common]
Login=YOUR_LOGIN
Password=YOUR_PASSWORD
Server=YOUR_SERVER
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

# Run container (similar to Go Brain)
docker run -d --name ${CONTAINER_NAME} \
  -v /root/imperial-factory/config/launch_${CONNECTION_ID}.ini:/mt5/config/launch.ini:ro \
  imperial-mt5-worker

# Check status
docker ps -a | grep ${CONTAINER_NAME}
docker logs ${CONTAINER_NAME}
```

---

## 📝 **Quick Reference: Most Common Commands**

```bash
# Check status
docker ps -a | grep test-mt5-worker

# View logs
docker logs test-mt5-worker

# Watch logs live
docker logs -f test-mt5-worker

# Check MT5 process
docker exec test-mt5-worker ps aux | grep terminal64

# Check resources
docker stats test-mt5-worker --no-stream

# Stop container
docker stop test-mt5-worker

# Remove container
docker rm test-mt5-worker
```

---

## 🎯 **Recommended Next Steps:**

1. **First:** Run Option D (Complete Verification Checklist) to see everything at once
2. **Then:** Decide if you want to test with real credentials (Option B) or deploy (Option C)
3. **Finally:** Use Option F for production testing
