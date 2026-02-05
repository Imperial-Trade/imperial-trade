# ✅ WebRequest URL Added to MT5 Configuration

## 🎯 **What Was Done**

Added the Supabase URL to MT5's allowed WebRequest URLs list in `common.ini`:

```
[WebRequest]
AllowedURLs=https://kmuoqkcxguafxulqlbmi.supabase.co
```

---

## 📍 **Location**

**File:** `/root/imperial-factory/mt5-master/config/common.ini`  
**Status:** ✅ Configuration added

---

## ⚠️ **Important: Docker Image Rebuild Required**

Since we modified the configuration file **after** the Docker image was built, we need to **rebuild the Docker image** for this change to take effect in containers.

**Next Step:** Rebuild the Docker image to include:
1. ✅ The compiled EA (`ImperialSync.ex5`)
2. ✅ The WebRequest URL configuration

---

## 🔄 **Rebuild Command**

```bash
cd /root/imperial-factory/mt5-master
docker build -t imperial-worker .
```

---

## ✅ **What This Does**

Once the Docker image is rebuilt and containers use it:
- MT5 will allow WebRequest calls to `https://kmuoqkcxguafxulqlbmi.supabase.co`
- The EA's `WebRequest()` function will work correctly
- Trade data will be sent to the Edge Function successfully

---

**Status:** ✅ URL added to config file  
**Next:** Rebuild Docker image to include this change
