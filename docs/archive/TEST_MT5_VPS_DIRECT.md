# 🧪 Test MT5 Credentials Directly in VPS Terminal

## 🎯 **Objective:**
Test MT5 connection and trade fetching directly in the VPS terminal BEFORE testing in frontend.

---

## 📋 **Test Credentials:**

### **Live Account:**
- **Login:** `81071266`
- **Password:** `Imperial@2026`
- **Server:** `ECMarkets-MT5-Live01`

### **Demo Account:**
- **Login:** `800107112`
- **Password:** `Demo@123`
- **Server:** `ECMarkets-MT5-Demo`

---

## 🔧 **Step 1: SSH into VPS**

```bash
ssh root@<vps-ip>
```

---

## 🧪 **Step 2: Test MT5 Connection**

Navigate to Python scripts directory:
```bash
cd /root/imperial-factory/vps-broker-service/python
```

### **Test Connection (Live Account):**
```bash
python3 test_connection.py '{"login": "81071266", "password": "Imperial@2026", "server": "ECMarkets-MT5-Live01", "portable_mode": false}'
```

**Expected Output:**
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

### **Test Connection (Demo Account):**
```bash
python3 test_connection.py '{"login": "800107112", "password": "Demo@123", "server": "ECMarkets-MT5-Demo", "portable_mode": false}'
```

**Expected Output:**
```json
{
  "connected": true,
  "account_info": {
    "login": 800107112,
    "balance": 0.0,
    "equity": 0.0,
    "server": "ECMarkets-MT5-Demo",
    "company": "EC Markets Ltd"
  },
  "server_used": "ECMarkets-MT5-Demo"
}
```

---

## 📊 **Step 3: Test Trade Fetching**

### **Check if fetch_trades.py can be run directly:**

```bash
# Check the script structure
head -50 fetch_trades.py
```

If `fetch_trades.py` requires specific arguments, we may need to check its structure.

### **Alternative: Use test_fetch_trades.py (if available):**

```bash
# Check if test script exists
ls -la test_fetch_trades.py

# If it exists, check how to use it
head -50 test_fetch_trades.py
```

---

## 🔍 **Step 4: Verify MT5 Terminal is Working**

### **Check MT5 Installation:**
```bash
# Check if MT5 is installed
ls -la /root/imperial-factory/mt5-master/terminal64.exe

# Check Wine
wine --version
```

### **Check if MT5 can start:**
```bash
# Try to initialize MT5 (this will show if Wine/MT5 is working)
python3 -c "
import sys
sys.path.insert(0, '/root/imperial-factory/vps-broker-service/python')
import MetaTrader5 as mt5
print('MT5 library version:', mt5.version())
print('MT5 initialized:', mt5.initialize())
mt5.shutdown()
"
```

---

## ✅ **Step 5: Test Complete Flow**

Create a test script to test connection AND fetch trades:

```bash
cat > /tmp/test_mt5_complete.py << 'EOF'
#!/usr/bin/env python3
import sys
import json
sys.path.insert(0, '/root/imperial-factory/vps-broker-service/python')

from test_connection import test_connection

# Test credentials
credentials = {
    "login": "800107112",  # Demo account
    "password": "Demo@123",
    "server": "ECMarkets-MT5-Demo",
    "portable_mode": False
}

print("Testing MT5 Connection...")
result = test_connection(
    credentials["login"],
    credentials["password"],
    credentials["server"],
    portable_mode=credentials["portable_mode"]
)

print("\n=== CONNECTION TEST RESULT ===")
print(json.dumps(result, indent=2))

if result.get("connected"):
    print("\n✅ Connection successful!")
    print(f"Account: {result.get('account_info', {}).get('login')}")
    print(f"Server: {result.get('server_used')}")
    
    # Now try to fetch trades
    print("\n\nTesting Trade Fetching...")
    try:
        import MetaTrader5 as mt5
        
        # Ensure connected
        if not mt5.initialize():
            print("❌ Failed to initialize MT5 for trade fetching")
            sys.exit(1)
        
        # Select all history
        import datetime
        from datetime import datetime, timedelta
        
        # Get history from account creation (year 1970 = all history)
        if mt5.history_select(datetime(1970, 1, 1), datetime.now()):
            total_deals = mt5.history_deals_total()
            print(f"✅ Total deals in history: {total_deals}")
            
            if total_deals > 0:
                # Get all deals
                deals = mt5.history_deals_get(datetime(1970, 1, 1), datetime.now())
                if deals:
                    print(f"✅ Retrieved {len(deals)} deals")
                    print(f"\nFirst 3 deals:")
                    for deal in deals[:3]:
                        print(f"  - Ticket: {deal.ticket}, Symbol: {deal.symbol}, Profit: {deal.profit}, Time: {datetime.fromtimestamp(deal.time)}")
                else:
                    print("⚠️ No deals retrieved")
            else:
                print("⚠️ Account has no trading history (0 deals)")
        else:
            error_code = mt5.last_error()
            print(f"❌ Failed to select history. Error code: {error_code}")
        
        mt5.shutdown()
    except Exception as e:
        print(f"❌ Error fetching trades: {e}")
        import traceback
        traceback.print_exc()
else:
    print("\n❌ Connection failed!")
    print(f"Error: {result.get('error', 'Unknown error')}")
    sys.exit(1)
EOF

python3 /tmp/test_mt5_complete.py
```

---

## 📝 **Expected Results:**

### **✅ Success Case:**
1. Connection test returns `"connected": true`
2. Account info is returned correctly
3. Trade fetching retrieves deals (or reports 0 if account has no history)
4. All trades/deals are accessible

### **❌ Failure Case:**
- Connection fails → Check credentials, server name, MT5 installation
- Trade fetching fails → Check MT5 permissions, history access
- No trades found → This is OK if account genuinely has no trading history

---

## 🔧 **Troubleshooting:**

### **Connection Fails:**
```bash
# Check MT5 installation
ls -la /root/imperial-factory/mt5-master/

# Check Wine
wine --version

# Check Python MT5 library
python3 -c "import MetaTrader5; print(MetaTrader5.version())"
```

### **Trade Fetching Fails:**
- Verify account has trading history in MT5
- Check if account has proper permissions
- Verify MT5 is properly connected (connection_status check)

---

## 🎯 **Next Steps After Successful Test:**

Once VPS terminal test succeeds:
1. ✅ Test via frontend UI
2. ✅ Verify container launch works
3. ✅ Check trades sync to Supabase
4. ✅ Verify frontend displays trades correctly

---

## 📋 **Quick Test Commands:**

**Test Live Account:**
```bash
cd /root/imperial-factory/vps-broker-service/python && \
python3 test_connection.py '{"login": "81071266", "password": "Imperial@2026", "server": "ECMarkets-MT5-Live01", "portable_mode": false}'
```

**Test Demo Account:**
```bash
cd /root/imperial-factory/vps-broker-service/python && \
python3 test_connection.py '{"login": "800107112", "password": "Demo@123", "server": "ECMarkets-MT5-Demo", "portable_mode": false}'
```
