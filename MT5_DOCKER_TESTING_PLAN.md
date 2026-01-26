# 🧪 MT5 Docker Container Testing Plan

## ✅ **Current Status (Already Verified):**

- ✅ Docker image built successfully
- ✅ Container runs without errors
- ✅ MT5 process (`terminal64.exe`) is running
- ✅ Wine environment is working (64-bit)
- ✅ No error spam in logs
- ✅ Container is stable

---

## 🎯 **Testing Steps:**

### **Phase 1: Verify Current Test Container**

Check what's currently running:

```bash
# 1. Check container status
docker ps -a | grep test-mt5-worker

# 2. Check if MT5 is still running
docker exec test-mt5-worker ps aux | grep terminal64

# 3. Check latest logs
docker logs --tail 50 test-mt5-worker

# 4. Check container resource usage
docker stats test-mt5-worker --no-stream
```

---

### **Phase 2: Test with Real Broker Credentials**

If you want to test with actual broker credentials, you'll need to:

1. **Stop current test container:**
```bash
docker stop test-mt5-worker
docker rm test-mt5-worker
```

2. **Create/Update launch.ini with real credentials:**
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

3. **Run new container:**
```bash
docker run -d --name test-mt5-worker \
  -v /root/imperial-factory/config/test_launch.ini:/mt5/config/launch.ini:ro \
  imperial-mt5-worker
```

4. **Monitor connection:**
```bash
# Wait for MT5 to start
sleep 15

# Check logs for connection status
docker logs test-mt5-worker

# Check if MT5 connected
docker logs test-mt5-worker 2>&1 | grep -i "connected\|login\|error\|fail"
```

---

### **Phase 3: Monitor MT5 Connection Status**

Check if MT5 successfully connected to broker:

```bash
# 1. Check logs for connection messages
docker logs test-mt5-worker | tail -100

# 2. Check for errors
docker logs test-mt5-worker 2>&1 | grep -i "error\|fail\|timeout\|connection" | tail -20

# 3. Check if Expert Advisor is running
docker exec test-mt5-worker ps aux | grep -i "imperial\|expert"

# 4. Monitor container health
docker stats test-mt5-worker --no-stream
```

---

### **Phase 4: Verify Expert Advisor (ImperialSync)**

Check if the Expert Advisor is loaded and running:

```bash
# Check MT5 logs (if available)
docker exec test-mt5-worker ls -la /mt5/logs/ 2>/dev/null

# Check for Expert Advisor files
docker exec test-mt5-worker ls -la /mt5/MQL5/Experts/ 2>/dev/null

# Check container processes
docker exec test-mt5-worker ps aux | grep -E "wine|terminal|expert"
```

---

### **Phase 5: Test Go Brain Integration (Optional)**

If you want to test the full integration with Go Brain:

1. **Stop test container:**
```bash
docker stop test-mt5-worker
docker rm test-mt5-worker
```

2. **Test via Go Brain service:**
   - Use the frontend to create a broker connection
   - Go Brain should create a `worker_{connectionID}` container
   - Monitor container creation and MT5 launch

---

## 📊 **What to Look For:**

### ✅ **Success Indicators:**
- Container stays running
- MT5 process continues running
- No errors in logs
- CPU/Memory usage is stable
- Connection messages in logs (if testing with real credentials)

### ❌ **Failure Indicators:**
- Container exits/crashes
- MT5 process stops
- Error messages in logs
- Connection timeout errors
- Authentication failures

---

## 🔍 **Troubleshooting:**

### **If Container Exits:**
```bash
# Check exit code
docker inspect test-mt5-worker | grep -A 10 "State"

# Check logs
docker logs test-mt5-worker

# Check for errors
docker logs test-mt5-worker 2>&1 | grep -i "error\|fail" | tail -20
```

### **If MT5 Won't Connect:**
- Verify credentials in `launch.ini`
- Check network connectivity from container
- Verify server name is correct
- Check MT5 server status

### **If Expert Advisor Not Loading:**
- Verify EA file exists: `/mt5/MQL5/Experts/ImperialSync.mq5`
- Check MT5 logs for EA loading errors
- Verify WebRequestUrl is correct

---

## 🎯 **Next Steps After Testing:**

1. **If tests pass:** Deploy to production via Go Brain
2. **If issues found:** Debug specific problems
3. **If connection works:** Test trade synchronization
4. **If EA loads:** Test WebRequest functionality
