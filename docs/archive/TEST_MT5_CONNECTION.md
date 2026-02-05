# 🧪 MT5 Connection Test Guide

## 🚀 **Quick Test Steps**

### 1. **Open Journal XX Pro**
- Navigate to: `http://localhost:8080`
- Go to **Auto Journal** section
- Click on **Add Broker Connection** or **Test Connection**

### 2. **Test Connection**
- Select a broker (PU Prime, XS, or EC Markets Demo)
- Enter your credentials:
  - Login ID
  - Password
  - Server name
- Click **Test Connection**

### 3. **Monitor in Real-Time**

#### **VPS Logs** (Terminal 1):
```powershell
pm2 logs imperial-trade-broker-service
```

#### **Edge Function Logs** (Supabase Dashboard):
1. Go to: https://supabase.com/dashboard/project/kmuoqkcxguafxulqlbmi/functions
2. Click on `test-broker-connection`
3. View **Logs** tab
4. Watch for connection attempts

#### **Browser Console** (F12):
- Open Developer Tools (F12)
- Check Console tab for connection status
- Check Network tab for API calls

## 📊 **What to Look For**

### ✅ **Success Indicators:**
- Connection succeeds
- Account info displayed (balance, equity, etc.)
- Server name used shown in response
- Connection time < 60 seconds

### ❌ **Failure Indicators:**
- Connection timeout (> 60s)
- Invalid credentials error
- MT5 initialization failed
- Server name not found

## 🔍 **Expected Log Flow**

### **Frontend → Edge Function:**
```
POST /functions/v1/test-broker-connection
Headers: Authorization, Content-Type
Body: { broker_type, encrypted_login, encrypted_password, encrypted_server }
```

### **Edge Function → VPS:**
```
POST http://45.32.89.134:3001/test-connection
Headers: X-API-Key, Content-Type
Body: { broker_type, encrypted_login, encrypted_password, encrypted_server, user_id }
```

### **VPS → Python Script:**
```
python test_connection.py {credentials_json}
```

### **Python → MT5:**
```
mt5.initialize()
mt5.login(login, password, server)
mt5.account_info()
```

## 📝 **Test Checklist**

- [ ] Services running (PM2)
- [ ] VPS health check passing
- [ ] Frontend accessible (localhost:8080)
- [ ] Test connection from UI
- [ ] Monitor VPS logs
- [ ] Monitor Edge Function logs
- [ ] Verify connection succeeds
- [ ] Check response includes server_used
- [ ] Verify connection_time_ms is reasonable

---

**Ready to test!** Open Journal XX Pro and test a broker connection while monitoring logs.


