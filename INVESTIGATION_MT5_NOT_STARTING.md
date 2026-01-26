# 🔍 Investigation: MT5 Process Not Starting

## 🚨 **Issue Identified:**

From the output:
- ✅ Container is running (`Up 16 seconds`)
- ❌ **MT5 process (`terminal64.exe`) is NOT running**
- ❌ Logs are very sparse (only 2 lines - Wine initialization)
- ❌ No "🚀 Launching MT5 Worker Headless..." message
- ❌ No connection attempts

**This is different from the previous successful test!**

---

## 🔍 **Investigation Steps:**

### **1. Check All Processes (Not Just terminal64)**

The `grep terminal64` found nothing, but let's see ALL processes:

```bash
# Check ALL processes in container
docker exec test-mt5-worker ps aux

# Check if entrypoint script is running
docker exec test-mt5-worker ps aux | grep entrypoint

# Check if Wine processes exist
docker exec test-mt5-worker ps aux | grep wine

# Check if bash/shell is running
docker exec test-mt5-worker ps aux | grep bash
```

### **2. Check Full Logs (More Lines)**

We only saw 2 lines, but there might be more:

```bash
# Get ALL logs (not just tail 50)
docker logs test-mt5-worker

# Get logs with timestamps
docker logs -t test-mt5-worker

# Check for the entrypoint message
docker logs test-mt5-worker 2>&1 | grep -i "launching\|entrypoint\|mt5"
```

### **3. Check Container Exit Status**

```bash
# Check if container exited (even if docker ps shows it's running)
docker inspect test-mt5-worker | grep -A 10 "State"

# Check container health
docker inspect test-mt5-worker | grep -A 5 "Health"
```

### **4. Check Entrypoint Script**

Verify the entrypoint script is correct:

```bash
# Check if entrypoint script exists
docker exec test-mt5-worker ls -la /mt5/entrypoint.sh

# Check entrypoint script permissions
docker exec test-mt5-worker file /mt5/entrypoint.sh

# Try to execute entrypoint manually (if possible)
docker exec test-mt5-worker /bin/bash /mt5/entrypoint.sh
```

### **5. Compare with Previous Successful Container**

```bash
# Check if old container logs show what worked
# (if you still have access to previous container logs)

# Key differences to check:
# - Image version
# - Entrypoint script
# - MT5 files
```

---

## 🎯 **Diagnostic Commands (Run These):**

```bash
echo "=== 1. All Processes ==="
docker exec test-mt5-worker ps aux

echo ""
echo "=== 2. Full Logs ==="
docker logs test-mt5-worker

echo ""
echo "=== 3. Container State ==="
docker inspect test-mt5-worker | grep -A 15 "State"

echo ""
echo "=== 4. Entrypoint Script ==="
docker exec test-mt5-worker ls -la /mt5/entrypoint.sh
docker exec test-mt5-worker head -20 /mt5/entrypoint.sh 2>/dev/null

echo ""
echo "=== 5. MT5 Files ==="
docker exec test-mt5-worker ls -la /mt5/ | head -20

echo ""
echo "=== 6. Check for Errors ==="
docker logs test-mt5-worker 2>&1 | tail -100
```

---

## 🤔 **Possible Causes:**

1. **Entrypoint script not executing**
   - Script might not be running
   - Script might be crashing silently

2. **MT5 executable not found**
   - `terminal64.exe` might not be in `/mt5/`
   - File permissions issue

3. **Wine not launching MT5**
   - Wine command failing
   - Path issues

4. **Container image issue**
   - Image might be different from previous test
   - Files might be missing

5. **Configuration file issue**
   - `launch.ini` might have issues
   - Mount point problem

---

## ✅ **Next Steps:**

Run the diagnostic commands above to identify the root cause!
