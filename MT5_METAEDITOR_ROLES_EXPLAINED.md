# 🐧 MT5 Terminal & MetaEditor on Ubuntu - Complete Explanation

## ✅ **Yes! Both Are on Ubuntu VPS:**

### **What's on the VPS:**

1. **MT5 Terminal (`terminal64.exe`)**
   - **Size:** 127MB
   - **Location:** `/root/imperial-factory/mt5-master/terminal64.exe`
   - **Type:** Windows executable (runs via Wine)

2. **MetaEditor (`MetaEditor64.exe`)**
   - **Size:** 104MB
   - **Location:** `/root/imperial-factory/mt5-master/MetaEditor64.exe`
   - **Type:** Windows executable (runs via Wine)
   - **Status:** ✅ **Just compiled EA successfully!**

3. **MetaTester (`metatester64.exe`)**
   - **Size:** 61MB
   - **Purpose:** Backtesting tool (not used in our setup)

---

## 🔄 **How They Work Together:**

### **Architecture Overview:**

```
Ubuntu VPS (Linux)
  │
  ├── Wine (Windows Emulation Layer)
  │   │
  │   ├── MetaEditor64.exe (Development Tool)
  │   │   └── Compiles: .mq5 → .ex5
  │   │   └── Runs on: VPS directly (for compilation)
  │   │   └── Used: When EA code is updated
  │   │
  │   └── terminal64.exe (Runtime Platform)
  │       └── Runs: Inside Docker containers
  │       └── Executes: EA (.ex5) code
  │       └── Connects: To broker servers
  │       └── Used: Every broker connection
  │
  └── Docker Containers
      └── Each container runs terminal64.exe
      └── Isolated per broker connection
```

---

## 🎯 **Their Specific Roles:**

### **1. MetaEditor (`MetaEditor64.exe`) - Development Tool**

**Purpose:** Compile MQL5 source code

**Location:** On VPS (`/root/imperial-factory/mt5-master/`)

**When Used:**
- ✅ When EA code is updated (`.mq5` file)
- ✅ Compiles source code → binary (`.ex5`)
- ✅ Runs on VPS directly (not in containers)

**How It Works:**
```bash
# On VPS:
wine MetaEditor64.exe /compile:MQL5/Experts/ImperialSync.mq5
# Result: Creates ImperialSync.ex5
```

**Status:**
- ✅ **Just compiled EA successfully on Ubuntu!**
- ✅ 0 errors, 0 warnings
- ✅ Works perfectly via Wine

---

### **2. MT5 Terminal (`terminal64.exe`) - Runtime Platform**

**Purpose:** Execute trading platform and run EAs

**Location:** 
- On VPS: `/root/imperial-factory/mt5-master/terminal64.exe`
- In Docker: `/mt5/terminal64.exe` (copied into image)

**When Used:**
- ✅ Every time a broker connection is triggered
- ✅ Runs inside Docker containers
- ✅ Loads and executes EA (`.ex5` file)
- ✅ Connects to broker servers
- ✅ Handles trade data

**How It Works:**
```bash
# Inside Docker container (entrypoint.sh):
Xvfb :99 -screen 0 1024x768x16 &  # Virtual display
export DISPLAY=:99
wine /mt5/terminal64.exe /portable /config:/mt5/config/launch.ini
```

**What It Does:**
1. Starts MT5 Terminal (via Wine)
2. Auto-logs into broker (from `launch.ini`)
3. Loads EA from `/mt5/MQL5/Experts/ImperialSync.ex5`
4. EA executes: validates connection, sends heartbeat, syncs trades

---

## 📊 **Complete Flow:**

### **Development Flow (MetaEditor):**
```
1. Update EA code (ImperialSync.mq5)
         ↓
2. Upload to VPS: /root/imperial-factory/mt5-master/MQL5/Experts/
         ↓
3. Compile on VPS:
   wine MetaEditor64.exe /compile:MQL5/Experts/ImperialSync.mq5
         ↓
4. Creates: ImperialSync.ex5 (binary)
         ↓
5. Rebuild Docker image (includes new .ex5)
         ↓
6. Ready for runtime!
```

### **Runtime Flow (MT5 Terminal):**
```
1. User triggers broker connection
         ↓
2. Go Brain launches Docker container
         ↓
3. Container entrypoint.sh:
   - Starts Xvfb (virtual display)
   - Runs: wine terminal64.exe /portable /config:launch.ini
         ↓
4. MT5 Terminal starts:
   - Auto-logs into broker
   - Loads EA (ImperialSync.ex5)
         ↓
5. EA executes:
   - Validates connection (4 layers)
   - Sends heartbeat → Edge Function
   - Syncs trades → Supabase
         ↓
6. Container runs for 90 seconds, then cleans up
```

---

## 🔍 **Key Differences:**

| Aspect | MetaEditor | MT5 Terminal |
|--------|-----------|--------------|
| **Purpose** | Development (compile EA) | Runtime (execute EA) |
| **Location** | On VPS directly | In Docker containers |
| **When Used** | When EA code changes | Every broker connection |
| **Frequency** | Rarely (only when updating EA) | Frequently (every sync) |
| **Input** | `.mq5` source code | `.ex5` binary + credentials |
| **Output** | `.ex5` binary | Trade data, heartbeats |

---

## ✅ **Current Status:**

### **MetaEditor:**
- ✅ On VPS: `/root/imperial-factory/mt5-master/MetaEditor64.exe`
- ✅ Working: Just compiled EA successfully!
- ✅ Runs via: Wine (Windows emulation)
- ✅ Purpose: Compile EA code

### **MT5 Terminal:**
- ✅ On VPS: `/root/imperial-factory/mt5-master/terminal64.exe`
- ✅ In Docker: Copied into `imperial-mt5-worker` image
- ✅ Working: Runs in containers via Wine + Xvfb
- ✅ Purpose: Execute EA and connect to brokers

---

## 🎯 **Summary:**

**Yes, both are on Ubuntu!**

- ✅ **MetaEditor:** On VPS, used for compilation (just worked!)
- ✅ **MT5 Terminal:** In Docker containers, used for runtime
- ✅ **Both run via Wine** (Windows emulation layer)
- ✅ **Everything works perfectly on Ubuntu!**

**No Windows VPS needed - Ubuntu handles it all!** 🎉
