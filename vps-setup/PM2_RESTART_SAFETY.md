# 🔒 PM2 Restart Safety Guide

## ⚠️ CRITICAL: PM2 Restart Commands

### ❌ DANGEROUS - Restarts BOTH:
```powershell
pm2 restart all          # ❌ Restarts ALL processes (both services)
pm2 restart              # ❌ Restarts ALL processes (if no name specified)
pm2 restart *            # ❌ Restarts ALL processes
```

### ✅ SAFE - Restarts ONLY ONE:
```powershell
pm2 restart "Imperial Price Feeder"              # ✅ Only Price Feeder
pm2 restart imperial-trade-broker-service       # ✅ Only Broker Service
pm2 restart 0                                   # ✅ Only process ID 0
pm2 restart 1                                   # ✅ Only process ID 1
```

---

## 📋 PM2 Command Reference

### Check Status (Safe - Read Only)
```powershell
pm2 status                    # Shows all processes
pm2 list                      # Shows all processes (detailed)
pm2 logs "Imperial Price Feeder" --lines 10    # View logs
pm2 logs imperial-trade-broker-service --lines 10  # View logs
```

### Restart Individual Services (Safe)
```powershell
# Restart Price Feeder ONLY
pm2 restart "Imperial Price Feeder"
pm2 save

# Restart Broker Service ONLY
pm2 restart imperial-trade-broker-service
pm2 save
```

### Stop Individual Services (Safe)
```powershell
# Stop Price Feeder ONLY
pm2 stop "Imperial Price Feeder"

# Stop Broker Service ONLY
pm2 stop imperial-trade-broker-service
```

### Start Individual Services (Safe)
```powershell
# Start Price Feeder ONLY
pm2 start "Imperial Price Feeder"

# Start Broker Service ONLY
pm2 start imperial-trade-broker-service
```

---

## 🚨 NEVER USE THESE:

```powershell
pm2 restart all              # ❌ Restarts BOTH
pm2 delete all               # ❌ DELETES BOTH (very dangerous!)
pm2 stop all                 # ❌ Stops BOTH
pm2 start all                # ❌ Starts BOTH (if stopped)
pm2 reload all               # ❌ Reloads BOTH
```

---

## ✅ Safe Workflow Examples

### Example 1: Restart Broker Service Only
```powershell
# Check status first
pm2 status

# Restart broker service only
pm2 restart imperial-trade-broker-service
pm2 save

# Verify price feeder is still running
pm2 status
# Should show: Imperial Price Feeder still "online"
```

### Example 2: Restart Price Feeder Only
```powershell
# Check status first
pm2 status

# Restart price feeder only
pm2 restart "Imperial Price Feeder"
pm2 save

# Verify broker service is still running
pm2 status
# Should show: imperial-trade-broker-service still "online"
```

### Example 3: Check Both Services
```powershell
# View all processes
pm2 status

# View logs for both (separate commands)
pm2 logs "Imperial Price Feeder" --lines 10
pm2 logs imperial-trade-broker-service --lines 10
```

---

## 🎯 Quick Reference

| Command | What It Does | Safe? |
|---------|--------------|-------|
| `pm2 restart all` | Restarts ALL processes | ❌ NO |
| `pm2 restart "Imperial Price Feeder"` | Restarts Price Feeder only | ✅ YES |
| `pm2 restart imperial-trade-broker-service` | Restarts Broker Service only | ✅ YES |
| `pm2 delete all` | DELETES ALL processes | ❌ NO |
| `pm2 status` | Shows status (read-only) | ✅ YES |
| `pm2 logs <name>` | Shows logs (read-only) | ✅ YES |

---

## 💡 Pro Tips

1. **Always check status first**: `pm2 status` before restarting
2. **Use service names**: More reliable than IDs (IDs can change)
3. **Save after changes**: `pm2 save` to persist configuration
4. **Verify after restart**: Check `pm2 status` to confirm only one restarted

---

## 🔍 How to Identify Service Names

```powershell
pm2 list
```

**Output example:**
```
┌─────┬──────────────────────────────┬─────────┬─────────┬──────────┐
│ id  │ name                         │ status  │ restart │ uptime   │
├─────┼──────────────────────────────┼─────────┼─────────┼──────────┤
│ 0   │ Imperial Price Feeder        │ online  │ 0       │ 2h       │
│ 1   │ imperial-trade-broker-service│ online  │ 0       │ 1h       │
└─────┴──────────────────────────────┴─────────┴─────────┴──────────┘
```

**Use the exact name from the "name" column!**

---

**Remember: Always specify the service name when restarting!**
