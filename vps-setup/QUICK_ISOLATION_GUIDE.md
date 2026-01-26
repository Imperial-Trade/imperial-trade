# 🚀 Quick Service Isolation Guide

## ✅ **Isolation Scripts Deployed!**

You now have isolated restart scripts that prevent services from affecting each other.

---

## 📋 **How to Use**

### **1. Restart ONLY Price Feeder (Safe)**
```powershell
cd C:\imperial-price-feeder
.\RESTART.ps1
```

### **2. Restart ONLY Broker Service (Safe)**
```powershell
cd C:\vps-broker-service
.\RESTART.ps1
```

### **3. Check Service Status (Read-Only)**
```powershell
.\C:\SERVICE_STATUS.ps1
```

---

## ⚠️ **Important: Always Use Service-Specific Commands**

### ❌ **DON'T DO THIS:**
```powershell
pm2 restart all        # Restarts EVERYTHING - affects price feeder!
pm2 delete all         # Deletes EVERYTHING - dangerous!
pm2 reload all         # Reloads EVERYTHING - affects price feeder!
```

### ✅ **DO THIS:**
```powershell
# Restart only what you're working on
pm2 restart imperial-trade-broker-service  # Only broker
pm2 restart "Imperial Price Feeder"        # Only price feeder

# Always save after individual restarts
pm2 save
```

---

## 🔧 **When Deploying Broker Service**

### **Safe Deployment Process:**
```powershell
# 1. Stop ONLY broker service
pm2 stop imperial-trade-broker-service

# 2. Deploy your changes
# (Copy files, npm install, build, etc.)

# 3. Start ONLY broker service
pm2 start imperial-trade-broker-service

# 4. Save PM2 config (safe - only saves current state)
pm2 save

# 5. Verify Price Feeder still running
pm2 list | Select-String "Imperial Price Feeder"
```

---

## 🛡️ **Price Feeder Protection**

The **Price Feeder Watchdog** will automatically restart the Price Feeder if it stops:

- ✅ Monitors Price Feeder every 30 seconds
- ✅ Auto-restarts if it goes offline
- ✅ Prevents interruptions in live price feeds

**Even if something accidentally stops the Price Feeder, the watchdog will restart it!**

---

## 📊 **Quick Reference**

| Action | Command | Affects Price Feeder? |
|--------|---------|----------------------|
| Restart Broker | `pm2 restart imperial-trade-broker-service` | ❌ No |
| Restart Price Feeder | `pm2 restart "Imperial Price Feeder"` | ✅ Only Price Feeder |
| Check Status | `pm2 list` | ❌ No (read-only) |
| View Broker Logs | `pm2 logs imperial-trade-broker-service` | ❌ No |
| View Price Feeder Logs | `pm2 logs "Imperial Price Feeder"` | ❌ No |

---

## ✅ **Summary**

**You DON'T need a separate VPS!**

The issue was:
- ❌ Using commands that affect all services (`pm2 restart all`)
- ❌ Not isolating service restarts
- ❌ Sharing deployment processes

The solution:
- ✅ Use service-specific restart scripts
- ✅ Always restart services individually
- ✅ Price Feeder Watchdog provides additional protection
- ✅ Services are already in separate directories

**Now you can edit/deploy broker service without affecting the Price Feeder!**

---

**Last Updated**: 2025-01-07



