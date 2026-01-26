# 🔍 Verifying "Launching MT5 Worker Headless..." Message

## 📍 **Where the Message Comes From:**

The message `🚀 Launching MT5 Worker Headless...` is printed by the **entrypoint.sh script** in the Dockerfile.

**Location:** `docs/Dockerfile.imperial-mt5-worker` (line 30)

**In the entrypoint.sh script:**
```bash
echo "🚀 Launching MT5 Worker Headless..."
wine /mt5/terminal64.exe /portable /config:/mt5/config/launch.ini
```

## 🔍 **What Happens After the Message:**

1. **The message is printed** (what you see in logs)
2. **Then Wine runs:** `wine /mt5/terminal64.exe /portable /config:/mt5/config/launch.ini`
   - This should launch MT5 terminal
   - In headless mode, MT5 might not produce much output to stdout/stderr

## ⚠️ **Why You Might Not See More Output:**

- MT5 runs in headless mode (no GUI)
- Wine applications don't always output to console
- MT5 might be running but silent (normal behavior)
- The process might be running but waiting to connect

## ✅ **How to Verify MT5 is Actually Running:**

### **Check 1: Verify Processes Inside Container**

```bash
# Execute into the container
docker exec test-mt5-worker ps aux | grep -E "wine|terminal64|mt5"
```

**Expected output if MT5 is running:**
- You should see `wine` processes
- You might see `terminal64.exe` process
- Processes related to MT5

### **Check 2: Check All Running Processes**

```bash
# See all processes in container
docker exec test-mt5-worker ps aux
```

### **Check 3: Check if Container is Still Running**

```bash
# Check container status
docker ps | grep test-mt5-worker
```

If container shows `Up X minutes`, it's running (good sign).

### **Check 4: Check Container Resource Usage**

```bash
# Check CPU/memory usage
docker stats test-mt5-worker --no-stream
```

If CPU/memory usage is active, processes are running.

### **Check 5: Check Wine Processes Specifically**

```bash
# Look for Wine processes
docker exec test-mt5-worker pgrep -a wine
```

---

## 🎯 **What to Look For:**

✅ **Good Signs:**
- Container is running (status: "Up")
- Wine processes exist
- CPU/memory usage is non-zero
- No errors in logs

❌ **Concerning Signs:**
- Container exited/crashed
- No Wine processes
- Container shows 0% CPU usage (might be idle/waiting)
- Error messages in logs

---

## 💡 **Next Steps:**

Run the verification commands above to confirm:
1. Is MT5 process actually running?
2. Is the container healthy?
3. Are there any errors we're not seeing?
