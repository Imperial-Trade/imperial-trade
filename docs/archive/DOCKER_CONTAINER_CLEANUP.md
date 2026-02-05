# 🔧 Docker Container Cleanup Fix

## 🚨 **Error:**
```
docker: Error response from daemon: Conflict. The container name "/test-mt5-worker" is already in use
```

## ✅ **Quick Fix:**

The container from your previous test still exists. Remove it first:

```bash
# Remove the existing container (even if stopped)
docker rm -f test-mt5-worker

# Then run your test again
docker run -d --name test-mt5-worker \
  -v /root/imperial-factory/config/test_launch.ini:/mt5/config/launch.ini:ro \
  imperial-mt5-worker
```

---

## 🔍 **Or Check Container Status First:**

```bash
# See all containers (including stopped)
docker ps -a | grep test-mt5-worker

# If it's running, stop it first
docker stop test-mt5-worker

# Then remove it
docker rm test-mt5-worker
```

---

## 🧹 **Complete Cleanup (Recommended Before Testing):**

```bash
# Stop and remove test container
docker stop test-mt5-worker 2>/dev/null
docker rm test-mt5-worker 2>/dev/null

# Or force remove (stops if running, then removes)
docker rm -f test-mt5-worker

# Verify it's gone
docker ps -a | grep test-mt5-worker
# Should show nothing (container removed)
```

---

## 📋 **Updated Test Command (With Cleanup):**

```bash
# Clean up first
docker rm -f test-mt5-worker 2>/dev/null

# Then run test
docker run -d --name test-mt5-worker \
  -v /root/imperial-factory/config/test_launch.ini:/mt5/config/launch.ini:ro \
  imperial-mt5-worker

# Check logs
docker logs -f test-mt5-worker
```

---

**Run the cleanup command first, then retry your Docker run command!**
