# 🔍 Real-Time Connection Test Monitoring

## 🎯 **Current Monitoring Status**

### ✅ **Active Monitoring:**
- **VPS Broker Service Logs**: Real-time monitoring active
- **Connection Flow**: Ready to track
- **MT5 Login Process**: Will be logged

## 📊 **What We're Monitoring**

### **1. Frontend → Edge Function**
- API call to `test-broker-connection`
- Request payload (encrypted credentials)
- Response time

### **2. Edge Function → VPS**
- HTTP POST to `45.32.89.134:3001/test-connection`
- API key validation
- Request forwarding

### **3. VPS → Python Script**
- Credential decryption
- Python script execution
- Server variation attempts

### **4. Python → MT5**
- MT5 initialization
- Login attempt
- Account info retrieval

## 🔍 **Expected Log Flow**

### **When Connection Test Starts:**

#### **VPS Logs Will Show:**
```
📥 Received test-connection request: { broker_type, has_encrypted_login: true, ... }
🔓 Attempting to decrypt credentials...
✅ Credentials decrypted successfully: { login, server, ... }
🔌 Testing MT5 connection...
[MT5 Client] Will try X server name variation(s)
[MT5 Client] Attempt 1/X: Trying server "ECMarketsLtd-Demo"
[MT5 Client] Python stdout: Attempting MT5 login...
[MT5 Client] ✅ Connection successful with server "ECMarketsLtd-Demo" (XXXXms)
✅ MT5 connection successful (XXXXms): { login, server, balance }
```

#### **Edge Function Logs Will Show:**
```
🔍 VPS_MT5_SERVICE_URL check: { exists: true, ... }
✅ Testing connection via VPS: http://45.32.89.134:3001
📡 Calling VPS at: http://45.32.89.134:3001/test-connection
✅ VPS response received: { connected: true, has_account_info: true, ... }
✅ Connection verified for user ...
```

## 🧪 **Test Steps**

1. **Open Journal XX Pro**: `http://localhost:8080`
2. **Navigate to**: Auto Journal section
3. **Click**: "Add Broker Connection" or "Test Connection"
4. **Enter credentials**:
   - Broker: EC Markets Demo (or PU Prime, XS)
   - Login ID: (your MT5 login)
   - Password: (your MT5 password)
   - Server: ECMarketsLtd-Demo (or appropriate server)
5. **Click**: "Test Connection"
6. **Watch logs** in real-time

## ✅ **Success Indicators**

- ✅ Connection succeeds
- ✅ Account info returned
- ✅ Server name used shown
- ✅ Connection time < 60s
- ✅ No errors in logs

## ❌ **Failure Indicators**

- ❌ Connection timeout (> 60s)
- ❌ Invalid credentials
- ❌ MT5 initialization failed
- ❌ Server name not found
- ❌ Python script errors

## 📝 **Monitoring Commands**

### **View VPS Logs (Real-Time):**
```bash
sshpass -p '2#bWj}tv=}5d}u5}' ssh Administrator@45.32.89.134 "pm2 logs imperial-trade-broker-service"
```

### **View Recent Logs:**
```bash
sshpass -p '2#bWj}tv=}5d}u5}' ssh Administrator@45.32.89.134 "pm2 logs imperial-trade-broker-service --lines 50 --nostream"
```

### **Check Service Status:**
```bash
sshpass -p '2#bWj}tv=}5d}u5}' ssh Administrator@45.32.89.134 "pm2 list"
```

---

**Status**: ✅ **Monitoring Active - Ready for Test**


