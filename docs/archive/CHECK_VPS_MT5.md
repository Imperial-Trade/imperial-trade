# 🔍 Check VPS MT5 Installation

## 🎯 **Goal:**
Verify MT5 is properly installed on VPS before testing frontend.

---

## 🔧 **Commands to Run on VPS:**

### **Step 1: Check Docker Image (Most Important)**

The production system uses Docker containers. Check if the MT5 worker image exists:

```bash
docker images | grep imperial-mt5-worker
```

**Expected:** Should show `imperial-mt5-worker` image

### **Step 2: Check if MT5 Files Exist**

Check if MT5 terminal files are on the VPS (needed for Docker image):

```bash
# Check common MT5 locations
ls -la /root/imperial-factory/mt5-master/terminal64.exe 2>/dev/null
ls -la /root/.wine/drive_c/imperial-factory/mt5-master/terminal64.exe 2>/dev/null
ls -la /root/.wine/drive_c/Program\ Files/MetaTrader\ 5/terminal64.exe 2>/dev/null
```

### **Step 3: Check Docker Service**

Check if Docker is running:

```bash
docker ps
systemctl status docker
```

### **Step 4: Check Go Brain Service**

Check if Go Brain service is running (manages containers):

```bash
systemctl status imperial-brain
journalctl -u imperial-brain --tail 50
```

### **Step 5: Check if Containers Can Be Created**

Try to list any existing containers:

```bash
docker ps -a | grep worker
```

---

## 📋 **Quick Diagnostic Script:**

Run this on VPS to check everything:

```bash
echo "=== VPS MT5 Diagnostic ==="
echo ""
echo "1. Docker Images:"
docker images | grep imperial-mt5-worker
echo ""
echo "2. Docker Service:"
systemctl is-active docker
echo ""
echo "3. Go Brain Service:"
systemctl is-active imperial-brain
echo ""
echo "4. MT5 Files:"
ls -la /root/imperial-factory/mt5-master/terminal64.exe 2>/dev/null || echo "❌ MT5 not found in /root/imperial-factory/"
ls -la /root/.wine/drive_c/imperial-factory/mt5-master/terminal64.exe 2>/dev/null || echo "❌ MT5 not found in Wine drive_c"
echo ""
echo "5. Running Containers:"
docker ps
echo ""
echo "6. All Containers (including stopped):"
docker ps -a | grep worker | head -5
```

---

## ✅ **What to Look For:**

1. ✅ **Docker image exists:** `imperial-mt5-worker` should be present
2. ✅ **Docker is running:** `docker ps` should work
3. ✅ **Go Brain is running:** Service should be active
4. ✅ **MT5 files exist:** At least one path should have `terminal64.exe`

---

**Run these commands and share the output - I'll help diagnose what's working and what's not!**
