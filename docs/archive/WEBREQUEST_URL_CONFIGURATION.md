# 🔧 WebRequest URL Configuration for MT5

## ✅ **YES - The URL Must Be Added!**

The URL `https://kmuoqkcxguafxulqlbmi.supabase.co` **must** be added to MT5's allowed WebRequest URLs list, otherwise the EA will fail with error 4014.

---

## 🎯 **Where It Needs to Be Added**

Since the EA runs in **Docker containers on the VPS** (not on your Mac), the URL needs to be configured in the **Docker container's MT5 configuration**.

---

## 📋 **Configuration Options**

### **Option 1: Common.ini File (Recommended)**

MT5 stores WebRequest allowed URLs in `config/common.ini`. We can create/update this file in the Docker image.

**Location in Container:**
```
/mt5/config/common.ini
```

**Configuration:**
```ini
[WebRequest]
AllowedURLs=https://kmuoqkcxguafxulqlbmi.supabase.co
```

---

### **Option 2: Terminal.ini File**

Alternatively, in `config/terminal.ini`:

```ini
[WebRequest]
AllowedURLs=https://kmuoqkcxguafxulqlbmi.supabase.co
```

---

### **Option 3: Update Dockerfile**

We can add this configuration file creation to the Dockerfile:

```dockerfile
# Create common.ini with WebRequest URL
RUN echo '[WebRequest]' > /mt5/config/common.ini && \
    echo 'AllowedURLs=https://kmuoqkcxguafxulqlbmi.supabase.co' >> /mt5/config/common.ini
```

---

## 🚀 **Recommended Approach**

**Update the Dockerfile** to include the WebRequest URL configuration, then rebuild the image.

---

## ⚠️ **For Your Mac MT5 (Optional)**

If you want to test the EA on your Mac MT5:
1. Open MT5
2. Tools → Options → Expert Advisors
3. Check "Allow WebRequest for listed URL"
4. Add: `https://kmuoqkcxguafxulqlbmi.supabase.co`

**Note:** This is only for local testing. The production EA runs in Docker containers.

---

## ✅ **Next Steps**

1. Update Dockerfile to include WebRequest configuration
2. Rebuild Docker image
3. Test EA in container
