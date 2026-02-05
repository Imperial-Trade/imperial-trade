# 🔍 ToolbarWindowProc Errors Analysis

## 🚨 **Error Observed:**

**Massive stream of repeating errors:**
```
00d4:err:toolbar: ToolbarWindowProc unknown msg 0465 wp=00000000 lp=0031dab0
00d4:err:toolbar: ToolbarWindowProc unknown msg 0465 wp=00000000 lp=0031da20
00d4:err:toolbar: ToolbarWindowProc unknown msg 0465 wp=00000000 lp=0031e3a0
... (repeating continuously)
```

---

## 📊 **What This Means:**

### **ToolbarWindowProc Errors:**
- MT5's GUI toolbar is trying to process Windows messages
- Wine doesn't recognize message type `0x0465`
- This happens when MT5 tries to render UI elements
- The errors repeat continuously because MT5 keeps trying to process GUI events

### **Impact:**
- ✅ Container is running
- ✅ MT5 process started (entrypoint executed)
- ❌ MT5 GUI/toolbar cannot function properly
- ❌ MT5 may be stuck in a loop trying to process GUI messages
- ❌ Connection/sync functionality likely blocked

---

## 🎯 **Root Cause:**

This is **consistent with our previous diagnosis**:
1. **Wine environment not properly initialized**
2. **Missing Wine components** (Gecko, proper COM support)
3. **GUI/windowing system not properly configured**
4. **OLE/COM errors from earlier logs** also confirm Wine incompatibility

---

## ✅ **Conclusion:**

**The Docker container runs, but MT5 cannot function due to Wine/GUI errors.**

The `ToolbarWindowProc` errors are a **symptom** of the underlying Wine configuration problem. Combined with the OLE/COM errors we saw earlier, this confirms:

- The `imperial-mt5-worker` Docker image needs to be fixed
- Wine needs proper initialization and configuration
- The current Dockerfile is insufficient for MT5 to run properly

---

## 🔧 **Next Steps:**

**Before MT5 can work, the Docker image must be fixed.**

The errors show:
1. Container starts ✅
2. MT5 tries to start ✅
3. Wine/GUI errors prevent MT5 from functioning ❌
4. MT5 gets stuck in error loop ❌

---

**This confirms our diagnosis: The Docker image has Wine configuration issues that prevent MT5 from working.**
