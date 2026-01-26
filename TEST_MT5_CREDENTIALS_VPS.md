# 🧪 Test MT5 Credentials on VPS

## 🎯 **Testing MT5 Credentials**

To test MT5 credentials on the VPS, you can use the Python test script.

---

## 📋 **Test Credentials (From Previous Setup):**

### **Live Account:**
- **Login:** `81071266`
- **Password:** `Imperial@2026`
- **Server:** `ECMarkets-MT5-Live01`

### **Demo Account:**
- **Login:** `800107112`
- **Password:** `Demo@123`
- **Server:** `ECMarkets-MT5-Demo`

---

## 🔧 **Method 1: Test via Python Script on VPS**

### **Step 1: SSH into VPS**
```bash
ssh root@<vps-ip>
```

### **Step 2: Navigate to Python Scripts Directory**
```bash
cd /root/imperial-factory/vps-broker-service/python
```

### **Step 3: Run Test Script**

**Test Live Account:**
```bash
python3 test_connection.py '{"login": "81071266", "password": "Imperial@2026", "server": "ECMarkets-MT5-Live01", "portable_mode": false}'
```

**Test Demo Account:**
```bash
python3 test_connection.py '{"login": "800107112", "password": "Demo@123", "server": "ECMarkets-MT5-Demo", "portable_mode": false}'
```

### **Expected Output:**
```json
{
  "connected": true,
  "account_info": {
    "login": 81071266,
    "balance": 0.0,
    "equity": 0.0,
    "server": "ECMarkets-MT5-Live01",
    "company": "EC Markets Ltd"
  },
  "server_used": "ECMarkets-MT5-Live01"
}
```

---

## 🌐 **Method 2: Test via Frontend (Recommended)**

The easiest way to test credentials is through the frontend:

1. **Navigate to Journal XX Pro (Auto Journal)**
2. **Select Broker:** EC Markets
3. **Enter Credentials:**
   - Login ID: `81071266` (live) or `800107112` (demo)
   - Password: `Imperial@2026` (live) or `Demo@123` (demo)
   - Server: Select from dropdown (ECMarkets-MT5-Live01 or ECMarkets-MT5-Demo)
4. **Click "Connect Broker"**
5. **Check Connection Status:**
   - Should show "Connected" status
   - Should trigger sync automatically
   - Should show trade history (if any)

---

## 🔍 **Method 3: Test via Go Brain Container Launch**

When you connect via frontend, Go Brain will:
1. Launch a Docker container
2. Container runs MT5 with your credentials
3. EA sends trades to Supabase
4. Check database for synced trades

**Check Container Logs:**
```bash
# On VPS
docker logs <container-id>
```

**Check Go Brain Logs:**
```bash
# On VPS
journalctl -u imperial-brain -f
```

---

## ✅ **Verification Steps:**

### **1. Check Connection in Database:**
```sql
SELECT 
  id,
  broker_type,
  connection_status,
  is_active,
  last_sync_at,
  last_ping,
  created_at
FROM broker_connections
WHERE user_id = '<user_id>'
ORDER BY created_at DESC
LIMIT 1;
```

### **2. Check Synced Trades:**
```sql
SELECT COUNT(*) as trade_count
FROM trade_journal_entries
WHERE broker_connection_id = '<connection_id>'
AND sync_source = 'mt5_docker';
```

### **3. Check Container Status:**
```bash
# On VPS - List running containers
docker ps

# Check specific container logs
docker logs <container-id> --tail 100
```

---

## 🐛 **Troubleshooting:**

### **Connection Fails:**
- ✅ Check credentials are correct (case-sensitive)
- ✅ Verify server name matches exactly (case-sensitive)
- ✅ Check MT5 terminal is installed on VPS
- ✅ Verify Wine is running correctly

### **No Trades Found:**
- ✅ This is normal if account has no trading history
- ✅ System will show: "No trades found in your MT5 account"
- ✅ Verify connection_status = 'connected' in database

### **Container Not Launching:**
- ✅ Check Go Brain service is running: `systemctl status imperial-brain`
- ✅ Check database connection in Go Brain
- ✅ Verify sync_priority = 1 in broker_connections table

---

## 📝 **Quick Test Summary:**

| Test Method | When to Use | Difficulty |
|------------|-------------|------------|
| Frontend UI | Easiest, recommended | ⭐ Easy |
| Python Script | Direct VPS testing | ⭐⭐ Medium |
| Container Logs | Debugging issues | ⭐⭐⭐ Advanced |

---

## 🎯 **Recommended Approach:**

1. ✅ **Use Frontend UI** (easiest)
2. ✅ Check connection status in UI
3. ✅ Verify sync completes
4. ✅ Check trade history appears (or "No trades" message)

This tests the entire flow: Frontend → Database → Go Brain → Container → MT5 → Supabase → Frontend
