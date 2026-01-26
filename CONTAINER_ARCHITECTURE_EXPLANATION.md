# 🐳 Docker Container Architecture

## ✅ **Yes - Every Container Has MT5!**

Each Docker container launched by Go Brain contains:

### **Container Image: `imperial-mt5-worker`**

Each container includes:
1. **Wine** - Runs Windows MT5 on Linux
2. **MT5 Terminal** - Full MetaTrader 5 installation
3. **MQL5 EA** - ImperialSync.ex5 (Expert Advisor)
4. **Xvfb** - Virtual display (headless GUI)
5. **Launch Configuration** - `launch.ini` with user credentials

---

## 🔄 **How It Works:**

1. **Go Brain receives sync request** (from database trigger)
2. **Creates Docker container** using `imperial-mt5-worker` image
3. **Mounts `launch.ini`** with user's encrypted credentials (decrypted by Go Brain)
4. **Container starts MT5** automatically with credentials
5. **EA runs inside MT5** and syncs trades to Supabase
6. **Container cleans up** after sync completes (smart cleanup)

---

## 📋 **Container Details:**

- **Image:** `imperial-mt5-worker`
- **Environment Variable:** `CONN_ID=<connection_id>`
- **Mounted File:** `/mt5/config/launch.ini` (contains login credentials)
- **Container Name:** `worker_<connection_id>`

---

## ✅ **Summary:**

- ✅ Each container = Complete MT5 installation
- ✅ Each container = Isolated user session
- ✅ Each container = Runs EA to sync trades
- ✅ Up to 400 concurrent containers (MAX_WORKERS = 400)

---

**So yes, every container has its own MT5 terminal installed and ready to use!**
