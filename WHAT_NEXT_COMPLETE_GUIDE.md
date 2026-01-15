# 🎯 What's Next - Complete Action Plan

## ✅ What's Already Complete:

1. ✅ **SSH Keys**: Set up and working (`ssh vultr-vps`)
2. ✅ **MT5 Installation**: `/root/imperial-factory/mt5-master/terminal64.exe` (running)
3. ✅ **EA Files**: `ImperialSync.mq5` and `ImperialSync.ex5` uploaded to VPS
4. ✅ **Python/Wine**: MetaTrader5 library installed and working
5. ✅ **Broker Service**: Running on PM2 (port 3001)
6. ✅ **All Components**: Installed and ready

## 📋 Next Steps (In Order):

### **Step 1: Configure MT5 Options** ⚠️ CRITICAL

**On the VPS MT5 terminal**, you need to:

1. **Open MT5 Options:**
   - Tools → Options → Expert Advisors tab

2. **Add WebRequest URL:**
   - Check "Allow WebRequest for listed URL"
   - Click "+ add new URL"
   - Add: `https://kmuoqkcxguafxulqlbmi.supabase.co`
   - Click OK

3. **Verify Settings:**
   - ✅ "Allow algorithmic trading" - checked
   - ✅ "Allow DLL imports" - checked (if needed)
   - ✅ WebRequest URL added - **CRITICAL!**

### **Step 2: Test Broker Connection from Frontend**

1. **Open your app** (localhost:8080 or tradeimperial.com)
2. **Go to Journal XX Pro** → Connect Broker
3. **Enter MT5 credentials:**
   - Login: 81071266
   - Password: Imperial@2026
   - Server: ECMarkets-MT5-Live01
4. **Click "Connect Broker"**
5. **Verify:**
   - Status shows "Connected"
   - Trade history appears

### **Step 3: Verify End-to-End Flow**

**Check if trades sync:**
1. **Frontend** → Connect Broker → Should show "Connected"
2. **VPS** → Python script connects to MT5 → Fetches trades
3. **Supabase** → Edge Function receives data → Saves to database
4. **Frontend** → Realtime subscription → Shows trades

### **Step 4: Test EA (Optional - For Real-time Sync)**

If you want the EA to send trades automatically:
1. **Open MT5** on VPS
2. **Attach EA** to any chart:
   - Drag `ImperialSync` from Navigator to chart
3. **Enable EA:**
   - Check "Allow algorithmic trading" if prompted
4. **Monitor:**
   - Check MT5 Experts tab for EA logs
   - Check Supabase Edge Function logs

## 🔍 How to Verify Everything Works:

### **Test 1: Broker Connection**
```bash
# From your Mac
curl http://209.222.12.247:3001/health
# Should return: {"status":"ok"}
```

### **Test 2: Python Script Connection**
```bash
# SSH to VPS
ssh vultr-vps

# Test connection
cd /root/imperial-factory/broker-service/python
wine 'C:\Python310\python.exe' test_connection.py '{"login":"81071266","password":"Imperial@2026","server":"ECMarkets-MT5-Live01"}'
```

### **Test 3: Frontend Connection**
- Open browser → Journal XX Pro
- Connect broker → Should show "Connected" status
- Check browser console for any errors

## 📊 Current System Status:

- ✅ **VPS**: All services running
- ✅ **MT5**: Installed and running
- ✅ **EA**: Uploaded and ready
- ⏳ **MT5 Options**: Need to configure WebRequest URL
- ⏳ **Testing**: Ready to test end-to-end

## 🚀 Recommended Next Action:

**Start with Step 1** - Configure MT5 Options to add the WebRequest URL. This is critical for the EA to work.

Then proceed to **Step 2** - Test the broker connection from the frontend.
