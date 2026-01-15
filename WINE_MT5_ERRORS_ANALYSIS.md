# 🔍 Wine/MT5 Docker Errors Analysis

## 🚨 **Critical Errors Found:**

### **Error 1: OLE/COM Interface Failures (CRITICAL)**
```
0048:err:ole:StdMarshalImpl_MarshalInterface Failed to create ifstub, hr 0x80004002
0048:err:ole:CoMarshalInterface Failed to marshal the interface
0048:err:ole:apartment_get_local_server_stream Failed: 0x80004002
```

**What This Means:**
- Wine cannot properly handle Windows COM (Component Object Model) interfaces
- MT5 relies heavily on COM for internal communication
- **HR 0x80004002** = `E_NOINTERFACE` - requested interface not found/available
- **Impact:** MT5 cannot start properly - core functionality blocked

---

### **Error 2: SetupAPI Copy Error**
```
0040:err:setupapi:SetupDefaultQueueCallbackW copy error 1812 L"@wineusb.sys,-1" -> L"C:\\windows\\inf\\wineusb.inf"
```

**What This Means:**
- Wine setup system cannot copy USB driver files
- Error 1812 = File/resource not found or corrupted
- **Impact:** May affect USB device handling (less critical for headless MT5)

---

### **Error 3: Wine Gecko Missing (Warning)**
```
Could not find Wine Gecko. HTML rendering will be disabled.
```

**What This Means:**
- Wine Gecko (HTML rendering engine) not installed
- MT5 uses HTML for help/UI components
- **Impact:** Some UI elements may not render (may not block core functionality)

---

### **Error 4: ToolbarWindowProc Errors (Repeating)**
```
00d8:err:toolbar: ToolbarWindowProc unknown msg 0465 wp=00000000 lp=0031dab0
```

**What This Means:**
- MT5 GUI toolbar trying to process unknown Windows messages
- Wine doesn't recognize message type 0x0465
- **Impact:** GUI elements failing, MT5 may be partially running but unstable

---

## 🎯 **Root Cause:**

**The Docker image's Wine environment is incomplete or misconfigured.**

The current Dockerfile installs basic Wine but doesn't:
1. ✅ Initialize Wine properly (first-time setup)
2. ✅ Install Wine Gecko/Mono components
3. ✅ Configure Wine for MT5 compatibility
4. ✅ Handle COM/OLE subsystem properly

---

## ✅ **Solutions:**

### **Solution 1: Improve Dockerfile (Recommended)**

The Dockerfile needs:
1. **Wine initialization** (`wineboot --init`)
2. **Wine Gecko/Mono** installation
3. **Better Wine configuration** for MT5
4. **Wait for Wine init** before running MT5

### **Solution 2: Use Wine Staging (Better Compatibility)**

Wine Staging has better Windows compatibility than standard Wine.

### **Solution 3: Check Docker Image Build**

The `imperial-mt5-worker` image may not be built correctly or may be outdated.

---

## 🔧 **Next Steps:**

1. **Check if Docker image exists and is built correctly**
2. **Review/update Dockerfile** with proper Wine setup
3. **Rebuild Docker image** with fixes
4. **Test again**

---

## 📋 **Quick Diagnostic Commands:**

```bash
# Check if image exists
docker images | grep imperial-mt5-worker

# Check image details
docker inspect imperial-mt5-worker

# Check container logs more carefully
docker logs test-mt5-worker 2>&1 | grep -i "error\|warn\|fail" | head -20

# Check if Wine is installed in container
docker run --rm imperial-mt5-worker wine --version
```
