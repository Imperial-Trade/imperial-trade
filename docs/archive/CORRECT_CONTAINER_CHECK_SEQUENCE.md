# ✅ Correct Container Check Sequence

## 🚨 **Issue: Container Was Removed Before Checking Logs**

You removed the container with `docker rm -f` **before** checking logs. Check logs **FIRST**, then remove if needed.

---

## 📋 **Correct Sequence:**

### **Step 1: Start Container (if not already running)**
```bash
docker run -d --name test-mt5-worker \
  -v /root/imperial-factory/config/test_launch.ini:/mt5/config/launch.ini:ro \
  imperial-mt5-worker
```

### **Step 2: Wait a Few Seconds for MT5 to Start**
```bash
sleep 5
```

### **Step 3: Check Container Status**
```bash
docker ps | grep test-mt5-worker
```

### **Step 4: Check Logs (DO THIS BEFORE REMOVING!)**
```bash
# View logs
docker logs test-mt5-worker

# Or view last 50 lines
docker logs --tail 50 test-mt5-worker

# Or follow in real-time
docker logs -f test-mt5-worker
```

### **Step 5: Check for Errors**
```bash
docker logs test-mt5-worker 2>&1 | grep -i "error\|warn\|fail" | head -20
```

### **Step 6: Only THEN Remove (if needed)**
```bash
docker rm -f test-mt5-worker
```

---

## 🔧 **Quick All-in-One Command:**

```bash
# Remove old container (if exists)
docker rm -f test-mt5-worker 2>/dev/null

# Start new container
docker run -d --name test-mt5-worker \
  -v /root/imperial-factory/config/test_launch.ini:/mt5/config/launch.ini:ro \
  imperial-mt5-worker

# Wait for it to start
sleep 5

# Check logs
docker logs --tail 50 test-mt5-worker
```

---

## ⚠️ **Important:**

- ✅ **Check logs FIRST** while container is running
- ❌ **Don't remove container** before checking logs
- ✅ **Remove container AFTER** you're done checking logs

---

**Run the container again and check logs BEFORE removing it!**
