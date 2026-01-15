# 📦 Install MetaTrader5 Python Library on VPS

## ❌ **Error:**
```
ModuleNotFoundError: No module named 'MetaTrader5'
```

## ✅ **Solution: Install MetaTrader5 Package**

The `MetaTrader5` Python library needs to be installed on the VPS.

### **Install MetaTrader5:**

Run this on your VPS:

```bash
pip3 install MetaTrader5
```

Or if you need to use `python3 -m pip`:

```bash
python3 -m pip install MetaTrader5
```

### **Verify Installation:**

After installation, verify it's installed:

```bash
python3 -c "import MetaTrader5; print('MetaTrader5 version:', MetaTrader5.__version__)"
```

### **Then Run Tests Again:**

After installing, run the connection test again:

```bash
cd /root/imperial-factory/broker-service/python && \
python3 test_connection.py '{"login": "800107112", "password": "Demo@123", "server": "ECMarkets-MT5-Demo", "portable_mode": false}'
```

---

## 🔧 **If Installation Fails:**

If `pip3` is not available, you may need to install pip first:

```bash
apt-get update
apt-get install -y python3-pip
```

Then try installing MetaTrader5 again:

```bash
pip3 install MetaTrader5
```
