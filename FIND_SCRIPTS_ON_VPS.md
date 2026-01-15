# 🔍 Find Python Scripts on VPS

## ❌ **Error:**
```
-bash: cd: /root/imperial-factory/vps-broker-service/python: No such file or directory
```

## 🔧 **Solution: Find the Correct Path**

The Python scripts might be in a different location. Let's find them:

### **Step 1: Find Python Scripts**

Run these commands on VPS to locate the scripts:

```bash
# Search for test_connection.py
find /root -name "test_connection.py" 2>/dev/null

# Search for fetch_trades.py
find /root -name "fetch_trades.py" 2>/dev/null

# List common locations
ls -la /root/ 2>/dev/null
ls -la /root/imperial* 2>/dev/null
ls -la /root/vps* 2>/dev/null
ls -la /root/broker* 2>/dev/null
```

### **Step 2: Check Common Locations**

Try these common paths:

```bash
# Check if scripts are directly in root
ls -la /root/*.py 2>/dev/null

# Check vps-broker-service directory
ls -la /root/vps-broker-service/python/ 2>/dev/null

# Check if there's a different structure
ls -la /root/imperial-factory/ 2>/dev/null
```

### **Step 3: If Scripts Don't Exist**

If the scripts don't exist on the VPS, we may need to:
1. Clone/copy the repository
2. Or install the scripts from the codebase

---

## 📋 **Quick Diagnostic Commands:**

Run these on VPS to see what's available:

```bash
# See what's in root
ls -la /root/

# Check for any Python files
find /root -name "*.py" -type f 2>/dev/null | head -20

# Check for broker/service related directories
ls -la /root/ | grep -i "broker\|vps\|imperial\|trade"
```
