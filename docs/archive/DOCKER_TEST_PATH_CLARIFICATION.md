# 📍 Correct Path for Docker Testing

## ✅ **For Docker Testing (Recommended - No Python Needed):**

The Docker test can be run from **ANYWHERE** on the VPS. Common locations:

### **Option 1: Run from `/root` (Recommended)**
```bash
cd /root
# Copy or create the test script here
./test-mt5-docker.sh <LOGIN> <PASSWORD> <SERVER>
```

### **Option 2: Run from `/root/imperial-factory`**
```bash
cd /root/imperial-factory
# Copy or create the test script here
./test-mt5-docker.sh <LOGIN> <PASSWORD> <SERVER>
```

### **Option 3: Run inline commands directly**
```bash
# Just run the docker commands from anywhere:
docker run -d --name test-mt5-worker \
  -v /root/imperial-factory/config/test_launch.ini:/mt5/config/launch.ini:ro \
  imperial-mt5-worker
```

---

## ❌ **Python Testing (Not Working - Can Skip):**

The Python scripts in `/root/imperial-factory/broker-service/python` are for a **different testing approach** that requires the `MetaTrader5` Python package. Since that package installation is failing, **you can skip Python testing entirely**.

---

## 🎯 **What You Need for Docker Testing:**

1. ✅ Docker installed and running
2. ✅ `imperial-mt5-worker` Docker image exists
3. ✅ A location to create the test script (anywhere is fine - `/root` is convenient)

**You do NOT need:**
- ❌ Python
- ❌ MetaTrader5 Python package
- ❌ Any specific directory

---

## 📋 **Quick Start from `/root`:**

```bash
# 1. Go to root directory
cd /root

# 2. Create the test script (copy from guide or create manually)
# (You can create it with nano/vim, or just run the commands directly)

# 3. Create config directory (if needed)
mkdir -p /root/imperial-factory/config

# 4. Create launch.ini file (replace credentials)
cat > /root/imperial-factory/config/test_launch.ini << 'EOF'
[Common]
Login=YOUR_LOGIN
Password=YOUR_PASSWORD
Server=YOUR_SERVER
ProxyEnable=0
CertConfirm=1

[Experts]
AllowLiveTrading=1
AllowDllImport=0
Enabled=1
AccountAndConsole=1
WebRequestEnable=1
WebRequestUrl=https://kmuoqkcxguafxulqlbmi.supabase.co

[Chart1]
Symbol=EURUSD
Period=M1
Expert=ImperialSync
EOF

# 5. Run Docker container
docker run -d --name test-mt5-worker \
  -v /root/imperial-factory/config/test_launch.ini:/mt5/config/launch.ini:ro \
  imperial-mt5-worker

# 6. Check logs
docker logs -f test-mt5-worker
```

---

## 🎯 **Summary:**

- **Docker test location:** ANYWHERE (typically `/root` for convenience)
- **Python test location:** `/root/imperial-factory/broker-service/python` (but Python package installation is failing, so skip this)
- **Recommended:** Use Docker testing from `/root` - no Python needed!
