# 🐧 MT5 Terminal & MetaEditor on Ubuntu - How They Work

## 📋 **What's on the Ubuntu VPS:**

### **1. MT5 Terminal (`terminal64.exe`)**
- **Location:** `/root/imperial-factory/mt5-master/terminal64.exe`
- **Type:** Windows executable (PE32+)
- **Size:** ~132MB
- **Purpose:** Runs MT5 trading platform
- **How it runs:** Via Wine (Windows emulation layer)

### **2. MetaEditor (`MetaEditor64.exe`)**
- **Location:** `/root/imperial-factory/mt5-master/MetaEditor64.exe`
- **Type:** Windows executable (PE32+)
- **Size:** ~108MB
- **Purpose:** Compiles MQL5 source code (`.mq5`) to binary (`.ex5`)
- **How it runs:** Via Wine
- **Status:** ✅ **Just used to compile EA successfully!**

---

## 🔄 **How They Work Together:**

### **Architecture:**

```
Ubuntu VPS
  ├── Wine (Windows Emulation Layer)
  │   ├── terminal64.exe (MT5 Terminal)
  │   │   └── Runs in headless mode (Xvfb virtual display)
  │   │   └── Loads Expert Advisors (EA) from /mt5/MQL5/Experts/
  │   │   └── Connects to broker servers
  │   │   └── Executes EA code (ImperialSync.ex5)
  │   │
  │   └── MetaEditor64.exe (MetaEditor)
  │       └── Compiles .mq5 → .ex5
  │       └── Used for EA development/compilation
  │
  └── Docker Containers
      └── Each container runs MT5 Terminal
      └── Isolated per broker connection
```

---

## 🎯 **Their Roles:**

### **MetaEditor (`MetaEditor64.exe`):**
**Purpose:** Development/Compilation Tool
- ✅ Compiles MQL5 source code (`.mq5`) → binary (`.ex5`)
- ✅ Used when updating EA code
- ✅ Runs on VPS (not in containers)
- ✅ Just compiled `ImperialSync.mq5` → `ImperialSync.ex5` successfully!

**When it's used:**
- When EA code is updated
- One-time compilation
- Creates `.ex5` binary file

**Location:**
- On VPS: `/root/imperial-factory/mt5-master/MetaEditor64.exe`
- Not in Docker containers (only used for compilation)

---

### **MT5 Terminal (`terminal64.exe`):**
**Purpose:** Trading Platform Runtime
- ✅ Runs inside Docker containers
- ✅ Connects to broker servers
- ✅ Loads and executes EAs (`.ex5` files)
- ✅ Handles trade data, connections, etc.

**When it's used:**
- Every time a broker connection is triggered
- Runs inside Docker containers
- Loads EA and executes it

**Location:**
- In Docker image: `/mt5/terminal64.exe`
- Copied into each container
- Runs via Wine + Xvfb (headless)

---

## 🔄 **Complete Flow:**

### **1. EA Development/Compilation:**
```
Developer updates ImperialSync.mq5
         ↓
Upload to VPS: /root/imperial-factory/mt5-master/MQL5/Experts/
         ↓
MetaEditor64.exe compiles (via Wine)
         ↓
Creates: ImperialSync.ex5
         ↓
Rebuild Docker image (includes new .ex5)
```

### **2. Runtime (Trading):**
```
User triggers broker connection
         ↓
Go Brain launches Docker container
         ↓
Container entrypoint.sh runs:
  - Starts Xvfb (virtual display)
  - Runs: wine terminal64.exe /portable /config:launch.ini
         ↓
MT5 Terminal starts
         ↓
Connects to broker (auto-login from launch.ini)
         ↓
EA (ImperialSync.ex5) loads automatically
         ↓
EA executes:
  - Validates connection
  - Sends heartbeat
  - Syncs trades
```

---

## 📊 **File Locations:**

### **On VPS (Development/Compilation):**
- `/root/imperial-factory/mt5-master/terminal64.exe` - MT5 Terminal
- `/root/imperial-factory/mt5-master/MetaEditor64.exe` - MetaEditor
- `/root/imperial-factory/mt5-master/MQL5/Experts/ImperialSync.mq5` - Source code
- `/root/imperial-factory/mt5-master/MQL5/Experts/ImperialSync.ex5` - Compiled binary

### **In Docker Containers (Runtime):**
- `/mt5/terminal64.exe` - MT5 Terminal (runs via Wine)
- `/mt5/MQL5/Experts/ImperialSync.ex5` - EA binary (executed by MT5)
- `/mt5/config/launch.ini` - Auto-login credentials

---

## ✅ **Summary:**

**MetaEditor:**
- ✅ Development tool (compile EA)
- ✅ Runs on VPS (via Wine)
- ✅ Used when updating EA code
- ✅ **Just successfully compiled EA on Ubuntu!**

**MT5 Terminal:**
- ✅ Runtime platform (executes EA)
- ✅ Runs in Docker containers (via Wine)
- ✅ Connects to brokers
- ✅ Loads and executes EAs

**Both work perfectly on Ubuntu via Wine!** 🎉
