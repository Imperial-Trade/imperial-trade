# 📊 Real-Time Monitoring Dashboard

## 🚀 **Quick Start Monitoring**

### **Terminal 1: VPS Service Logs**
```bash
sshpass -p '2#bWj}tv=}5d}u5}' ssh Administrator@45.32.89.134 "pm2 logs imperial-trade-broker-service"
```

### **Terminal 2: Service Status Check**
```bash
watch -n 2 'curl -s http://45.32.89.134:3001/health | python3 -m json.tool'
```

### **Terminal 3: PM2 Status**
```bash
sshpass -p '2#bWj}tv=}5d}u5}' ssh Administrator@45.32.89.134 "watch -n 5 'pm2 list'"
```

## 📱 **Browser Monitoring**

1. **Open Journal XX Pro**: `http://localhost:8080`
2. **Open Developer Tools** (F12):
   - **Console Tab**: Watch for connection logs
   - **Network Tab**: Monitor API calls to Edge Functions
   - Filter by: `test-broker-connection` or `sync-broker-trades`

## 🔍 **What to Monitor**

### ✅ **Success Indicators:**
- Connection succeeds in < 60 seconds
- Account info returned (balance, equity, server)
- Server name used shown in response
- No errors in logs

### ❌ **Failure Indicators:**
- Connection timeout (> 60s)
- Invalid credentials
- MT5 initialization failed
- Server name not found

## 📝 **Test Flow**

1. **Frontend** → Calls `test-broker-connection` Edge Function
2. **Edge Function** → Calls VPS `/test-connection`
3. **VPS** → Runs Python script `test_connection.py`
4. **Python** → Connects to Generic MT5
5. **MT5** → Returns account info

## 🎯 **Current Status**

- ✅ **VPS Service**: Running and healthy
- ✅ **Edge Function**: Deployed
- ✅ **Frontend**: Available at localhost:8080
- ⚠️ **Auto-Sync**: Non-critical error (doesn't affect connection testing)

---

**Ready to test!** Open Journal XX Pro and test a broker connection.


