# 🔍 Check Docker Container Logs

## ✅ **Container Started Successfully!**

Container ID: `e5e002e958008eb654ddf04d48ca0603e928523d33663b1f08384a418f9229a9`

---

## 📋 **Commands to Check Container:**

### **1. Check Container Status:**
```bash
docker ps -a | grep test-mt5-worker
```

### **2. View Container Logs:**
```bash
# View all logs
docker logs test-mt5-worker

# View last 50 lines
docker logs --tail 50 test-mt5-worker

# Follow logs in real-time (press Ctrl+C to stop)
docker logs -f test-mt5-worker
```

### **3. Check for Errors:**
```bash
# Filter for errors/warnings
docker logs test-mt5-worker 2>&1 | grep -i "error\|warn\|fail" | head -20
```

### **4. Check if Container is Running:**
```bash
docker ps | grep test-mt5-worker
```

If it shows nothing, the container may have exited. Check with:
```bash
docker ps -a | grep test-mt5-worker
```

---

## 🎯 **What to Look For:**

### **✅ Good Signs:**
- MT5 terminal starting
- Connection to broker
- EA (`ImperialSync`) loading
- WebRequest to Supabase succeeding
- No Wine OLE/COM errors

### **❌ Bad Signs:**
- Wine OLE/COM errors (like we saw before)
- Container exited immediately
- Connection failed
- EA failed to load
- ToolbarWindowProc errors

---

## 🔧 **Quick Diagnostic Script:**

Run this to see everything at once:

```bash
echo "=== Container Status ==="
docker ps -a | grep test-mt5-worker
echo ""
echo "=== Last 30 Lines of Logs ==="
docker logs --tail 30 test-mt5-worker
echo ""
echo "=== Errors/Warnings ==="
docker logs test-mt5-worker 2>&1 | grep -i "error\|warn\|fail" | head -10
```

---

**Run the log commands and share the output - I'll help diagnose if there are any issues!**
