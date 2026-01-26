# 🚀 Next Steps - EA-Only Flow Implementation

## ✅ Repository Status:
**All changes are in the repository:**
- ✅ Go Brain updated
- ✅ MQL5 EA updated
- ✅ Entrypoint script created

---

## 📋 Next Steps to Complete EA-Only Flow:

### Step 1: Prepare MT5 Master Profile (On Windows/Mac)
**Before building Docker image:**
1. Open MT5 on your Windows/Mac
2. Open one chart (e.g., EURUSD)
3. Drag `ImperialSync.ex5` (compiled EA) onto the chart
4. Ensure "Algo Trading" button is GREEN
5. Go to: **File > Profiles > Save As**
6. Name it exactly: **`default`**
7. This saves the EA configuration so it auto-runs in Docker

---

### Step 2: Upload Files to VPS
```bash
# Upload Go Brain
scp vps-broker-service/go-brain/main.go root@209.222.12.247:/root/imperial-factory/broker-service/go-brain/main.go

# Upload Entrypoint
scp vps-broker-service/go-brain/entrypoint.sh root@209.222.12.247:/root/imperial-factory/mt5-master/entrypoint.sh
ssh root@209.222.12.247 "chmod +x /root/imperial-factory/mt5-master/entrypoint.sh"

# Upload MQL5 EA (if compiled)
# scp docs/ImperialSync.ex5 root@209.222.12.247:/root/imperial-factory/mt5-master/MQL5/Experts/
```

---

### Step 3: Rebuild Go Brain (On VPS)
```bash
ssh root@209.222.12.247
cd /root/imperial-factory/broker-service/go-brain
go build -o imperial-brain
sudo systemctl restart imperial-brain
sudo journalctl -u imperial-brain -f
```

---

### Step 4: Build Docker Image (On VPS)
```bash
cd /root/imperial-factory/mt5-master
docker build -t imperial-mt5-worker .
```

---

### Step 5: Test End-to-End
1. Set `sync_priority = 1` in Supabase `broker_connections` table
2. Watch Go Brain logs: `journalctl -u imperial-brain -f`
3. Check Supabase `trade_journal_entries` table for trades
4. If trades appear → ✅ Login verified!

---

## 🎯 Summary:

**Repository Status**: ✅ All files in repository
**Next Step**: Prepare Docker image and deploy
