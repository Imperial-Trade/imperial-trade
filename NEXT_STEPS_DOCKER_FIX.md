# 🚀 Next Steps: Deploy Docker Fixes to VPS

## 📋 **Current Status:**

✅ **Repository:**
- Dockerfile updated with Wine fixes
- Correct naming: `imperial-mt5-worker`
- All fixes included (WINEDEBUG=-all, wineboot --init)

⚠️ **VPS:**
- Needs updated Dockerfile
- Needs image rebuild with fixes

---

## 🔧 **Step-by-Step Deployment:**

### **Step 1: Copy Updated Dockerfile to VPS**

**On your VPS, run:**

```bash
cd /root/imperial-factory/mt5-master

# Create/update the Dockerfile with fixes
cat > Dockerfile << 'EOF'
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN dpkg --add-architecture i386 && apt-get update && \
    apt-get install -y wine64 wine32:i386 xvfb wget && apt-get clean

WORKDIR /mt5
COPY . /mt5

RUN echo '#!/bin/bash\n\
Xvfb :99 -screen 0 1024x768x16 &\n\
export DISPLAY=:99\n\
export WINEDEBUG=-all\n\
if [ ! -d "/root/.wine" ]; then\n\
    wineboot --init\n\
    sleep 5\n\
fi\n\
echo "🚀 Launching MT5 Worker Headless..."\n\
wine /mt5/terminal64.exe /portable /config:/mt5/config/launch.ini' > /mt5/entrypoint.sh

RUN chmod +x /mt5/entrypoint.sh
ENTRYPOINT ["/mt5/entrypoint.sh"]
EOF
```

---

### **Step 2: Rebuild Docker Image with Fixes**

```bash
cd /root/imperial-factory/mt5-master
docker build -t imperial-mt5-worker .
```

**This will:**
- Build new image with Wine fixes
- Tag as `imperial-mt5-worker:latest`
- Replace old image (or create new one)

---

### **Step 3: Test the Fixed Image**

```bash
# Clean up old test container
docker rm -f test-mt5-worker 2>/dev/null

# Run test container
docker run -d --name test-mt5-worker \
  -v /root/imperial-factory/config/test_launch.ini:/mt5/config/launch.ini:ro \
  imperial-mt5-worker

# Wait for initialization
sleep 10

# Check logs (should see clean output, no error spam)
docker logs test-mt5-worker
```

**Expected Output (Good):**
```
🚀 Launching MT5 Worker Headless...
```
**(Then silence - no ToolbarWindowProc spam!)**

---

### **Step 4: Verify Image is Ready**

```bash
# Check image exists
docker images | grep imperial-mt5-worker

# Should show:
# imperial-mt5-worker   latest   <image-id>   <time>   2.41GB
```

---

## ✅ **Success Criteria:**

After completing these steps, you should have:
- ✅ Updated Dockerfile on VPS with Wine fixes
- ✅ Rebuilt Docker image with fixes
- ✅ Clean container logs (no error spam)
- ✅ Image ready for Go Brain to use

---

## 🎯 **After Testing:**

Once the test container shows clean logs:
- Go Brain can use the fixed image
- Containers should work properly for trade syncing
- No more Wine error spam

---

**Ready to proceed! Run these commands on your VPS in order.**
