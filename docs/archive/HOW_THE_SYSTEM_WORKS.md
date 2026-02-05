# 🏗️ How the System Actually Works

## ⚠️ **Important Clarification:**

The **frontend is NOT an MT5 login page**. Here's how it actually works:

---

## 🏗️ **System Architecture:**

```
┌─────────────────────────────────────────────────────────┐
│  YOUR FRONTEND (React App - localhost:8080)            │
│  ─────────────────────────────────────────────────────  │
│  1. Broker Connection Form                              │
│     → User enters: Account, Password, Server            │
│     → Credentials encrypted & saved to database         │
│                                                          │
│  2. View Synced Trades                                  │
│     → Display trades from database                      │
│     → Show journal entries                              │
└───────────────────┬─────────────────────────────────────┘
                    │
                    │ (Database: Supabase)
                    ↓
┌─────────────────────────────────────────────────────────┐
│  VPS BACKEND (Ubuntu Server)                           │
│  ─────────────────────────────────────────────────────  │
│  Go Brain (Orchestrator)                                │
│     → Reads credentials from database                   │
│     → Launches Docker containers                        │
│                                                          │
│  Docker Containers (Headless MT5)                       │
│     → REAL MT5 terminal (terminal64.exe)                │
│     → Connects to broker using credentials              │
│     → Runs MQL5 EA (ImperialSync.ex5)                   │
│     → EA sends trade data to Edge Function              │
└───────────────────┬─────────────────────────────────────┘
                    │
                    │ (HTTP POST)
                    ↓
┌─────────────────────────────────────────────────────────┐
│  Edge Function (Supabase)                               │
│  ─────────────────────────────────────────────────────  │
│  mt5-sync function                                      │
│     → Receives trade data from EA                       │
│     → Saves to database                                 │
└───────────────────┬─────────────────────────────────────┘
                    │
                    │ (Database Update)
                    ↓
┌─────────────────────────────────────────────────────────┐
│  YOUR FRONTEND (React App)                              │
│  ─────────────────────────────────────────────────────  │
│  → Displays trades from database                        │
│  → Real-time updates via Supabase Realtime              │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ **What the Frontend Does:**

1. **Broker Connection Form:**
   - User enters MT5 credentials (Account, Password, Server)
   - Credentials are **encrypted** client-side
   - Saved to `broker_connections` table in database
   - **Does NOT connect to MT5 directly**

2. **View Synced Trades:**
   - Displays trades from `trade_journal_entries` table
   - Shows data synced by the Docker containers
   - Real-time updates via Supabase

---

## ⚙️ **What Happens Behind the Scenes (VPS):**

1. **Go Brain:**
   - Reads credentials from database
   - Decrypts credentials
   - Creates dynamic `launch.ini` file
   - Launches Docker container with MT5

2. **Docker Container:**
   - Runs **REAL MT5 terminal** (terminal64.exe in Wine)
   - Connects to broker server using credentials
   - Loads MQL5 EA (ImperialSync.ex5)
   - EA sends trade data to Edge Function

3. **Edge Function:**
   - Receives trade data
   - Saves to database
   - Frontend displays it

---

## 🎯 **Key Points:**

- ✅ Frontend = UI for entering credentials & viewing trades
- ✅ Backend (VPS) = Real MT5 connections in Docker containers
- ✅ MT5 runs on VPS, NOT in browser
- ✅ Browser only displays results

---

## 📋 **Testing Flow:**

1. **Frontend:** Enter credentials → Save to database
2. **Go Brain:** Reads database → Launches Docker container
3. **Docker:** MT5 connects to broker → EA sends trades
4. **Edge Function:** Receives trades → Saves to database
5. **Frontend:** Displays trades from database

---

**The frontend is just the UI - the real MT5 connection happens on the VPS!** 🚀
