# 🔍 Check VPS MT5 Setup

## 🎯 **Run This on VPS:**

Copy and paste this script on your VPS:

```bash
echo "=== VPS MT5 Diagnostic ==="
echo ""
echo "1. Docker Service:"
systemctl is-active docker && echo "✅ Docker running" || echo "❌ Docker NOT running"
echo ""
echo "2. Docker Images:"
docker images | grep imperial-mt5-worker || echo "❌ imperial-mt5-worker image NOT found"
echo ""
echo "3. Go Brain Service:"
systemctl is-active imperial-brain && echo "✅ Go Brain running" || echo "❌ Go Brain NOT running"
echo ""
echo "4. MT5 Files:"
ls -la /root/imperial-factory/mt5-master/terminal64.exe 2>/dev/null && echo "✅ MT5 found" || echo "❌ MT5 NOT found"
echo ""
echo "5. Running Containers:"
docker ps | grep worker || echo "ℹ️  No worker containers running"
echo ""
echo "6. Go Brain Logs (last 10 lines):"
journalctl -u imperial-brain --no-pager -n 10
```

---

## 📋 **What to Check:**

1. ✅ **Docker is running**
2. ✅ **imperial-mt5-worker image exists**
3. ✅ **Go Brain service is running**
4. ✅ **MT5 files exist**
5. ✅ **No errors in Go Brain logs**

---

## 🔧 **Quick Commands (Copy/Paste Ready):**

**Check Docker:**
```bash
docker ps
docker images | grep imperial-mt5-worker
```

**Check Go Brain:**
```bash
systemctl status imperial-brain
journalctl -u imperial-brain --tail 50
```

**Check MT5 Files:**
```bash
ls -la /root/imperial-factory/mt5-master/terminal64.exe
```

---

**Run these on VPS and share the output - I'll help diagnose!**
