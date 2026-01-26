# 🔧 MetaTrader5 Installation Troubleshooting

## ❌ **Error:**
```
ERROR: No matching distribution found for MetaTrader5
```

## 🔍 **Diagnostic Steps:**

### **Step 1: Check Python Version**
```bash
python3 --version
```
MetaTrader5 requires Python 3.6+. If version is too old, you may need to upgrade Python.

### **Step 2: Upgrade pip**
```bash
pip3 install --upgrade pip
pip3 install MetaTrader5
```

### **Step 3: Try with verbose output**
```bash
pip3 install MetaTrader5 -v
```
This will show more details about why it's failing.

### **Step 4: Check pip configuration**
```bash
pip3 config list
```

---

## 💡 **Alternative Approach: Skip Python Testing**

Since the production system uses Docker containers (not Python scripts), and containers already have MT5:

**✅ Test directly via Frontend:**
- Containers have MT5 pre-installed
- EA runs automatically in containers
- Tests the actual production flow
- No Python installation needed

**Verify EA via:**
- Database checks (`connection_status`, `last_sync_at`, trades with `sync_source = 'mt5_docker'`)
- Container logs (on VPS)
- Edge Function logs (Supabase)

This tests the **real system** instead of test scripts!
