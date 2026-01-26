# ✅ Correct VPS Path

## 🔍 **Issue Found:**

From the `ls -la /root/` output:
- `imperial-factory` exists at: `/root/imperial-factory/`
- `vps-broker-service` exists at: `/root/vps-broker-service/`

These are **sibling directories**, NOT nested!

## ❌ **Wrong Path:**
```
/root/imperial-factory/vps-broker-service/python
```

## ✅ **Correct Path:**
```
/root/vps-broker-service/python
```

---

## 🧪 **Correct Test Commands:**

### **Test Connection:**
```bash
cd /root/vps-broker-service/python && \
python3 test_connection.py '{"login": "800107112", "password": "Demo@123", "server": "ECMarkets-MT5-Demo", "portable_mode": false}'
```

### **Test Trade Fetching:**
```bash
cd /root/vps-broker-service/python && \
python3 fetch_trades.py '{"login": "800107112", "password": "Demo@123", "server": "ECMarkets-MT5-Demo", "portable_mode": false}'
```

---

## 🔧 **Verify Path First:**

Before running tests, verify the scripts exist:

```bash
ls -la /root/vps-broker-service/python/test_connection.py
ls -la /root/vps-broker-service/python/fetch_trades.py
```
