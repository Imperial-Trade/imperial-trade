# 📋 VPS Deployment Status Check

## 🔍 Current Status

### ✅ **Files Prepared Locally**
All files are ready in: `./vps-broker-service/go-brain/`
- ✅ `main.go` - Updated with instant/realtime optimizations
- ✅ `go.mod` - Dependencies file
- ✅ `imperial-brain.service` - Systemd service file (correct paths)
- ✅ `deploy-to-vps.sh` - Deployment script
- ✅ `verify-vps-setup.sh` - Verification script
- ✅ `test-connection.sh` - Database connection test
- ✅ All documentation files

### ❓ **VPS Status - NEEDS VERIFICATION**

To check if everything is on the VPS, **SSH into the VPS and run**:

```bash
ssh root@209.222.12.247
```

Then check:

## 🔍 Verification Checklist

### 1. Check if Directories Exist
```bash
# Should exist:
ls -la /root/imperial-factory/broker-service/go-brain/
ls -la /root/imperial-factory/config/
ls -la /root/imperial-factory/mt5-master/
```

**Expected:**
- ✅ `/root/imperial-factory/broker-service/go-brain/` exists
- ✅ `/root/imperial-factory/config/` exists
- ✅ `/root/imperial-factory/mt5-master/` exists

### 2. Check if Go Brain Files Exist
```bash
cd /root/imperial-factory/broker-service/go-brain/
ls -la
```

**Expected files:**
- ✅ `main.go` exists
- ✅ `go.mod` exists
- ✅ `imperial-brain` (binary) exists OR needs to be built
- ✅ `imperial-brain.service` exists OR needs to be installed

### 3. Check if Systemd Service is Installed
```bash
systemctl status imperial-brain
ls -la /etc/systemd/system/imperial-brain.service
```

**Expected:**
- ✅ Service file exists at `/etc/systemd/system/imperial-brain.service`
- ✅ Service paths point to `/root/imperial-factory/broker-service/go-brain/`

### 4. Check if Docker Image Exists
```bash
docker images | grep imperial-mt5-worker
```

**Expected:**
- ✅ `imperial-mt5-worker:latest` image exists

### 5. Check if Service is Running
```bash
systemctl is-active imperial-brain
journalctl -u imperial-brain -n 20
```

**Expected:**
- ✅ Service is running (or can be started)
- ✅ Logs show correct paths and database connections

## 🚀 **If Files Are NOT on VPS**

### **Option 1: Quick Upload (Recommended)**
From your local machine:
```bash
cd "/Users/nthny_11/Trade imperial GITHUB /nov 7 notif project/imperial-trade"

# Create directories on VPS
ssh root@209.222.12.247 "mkdir -p /root/imperial-factory/broker-service/go-brain /root/imperial-factory/config /root/imperial-factory/mt5-master"

# Upload all Go Brain files
scp vps-broker-service/go-brain/* root@209.222.12.247:/root/imperial-factory/broker-service/go-brain/

# Run deployment script
ssh root@209.222.12.247 "cd /root/imperial-factory/broker-service/go-brain && chmod +x *.sh && ./deploy-to-vps.sh"
```

### **Option 2: Manual Deployment**
SSH into VPS and follow `QUICK_START.md` guide.

## 📊 **What Should Be Correct**

If files ARE on VPS, verify these are correct:

1. **Systemd Service Paths:**
   ```ini
   WorkingDirectory=/root/imperial-factory/broker-service/go-brain  ✅ CORRECT
   ExecStart=/root/imperial-factory/broker-service/go-brain/imperial-brain  ✅ CORRECT
   ```

2. **main.go Config Path:**
   ```go
   filepath.Join("/root/imperial-factory/config", ...)  ✅ CORRECT
   ```

3. **Docker Image Name:**
   ```go
   Image: "imperial-mt5-worker:latest"  ✅ CORRECT
   ```

4. **Container Naming:**
   ```go
   fmt.Sprintf("worker_%s", conn.ID)  ✅ CORRECT
   ```

5. **Database Credentials:**
   - DATABASE_URL: Pooler connection ✅
   - LISTENER_DATABASE_URL: Direct connection ✅
   - ENCRYPTION_SECRET: Set correctly ✅

## ⚡ **Quick Test Commands**

Once on VPS, run these to verify:

```bash
# 1. Verify directories
[ -d "/root/imperial-factory/broker-service/go-brain" ] && echo "✅ Go Brain dir exists" || echo "❌ Missing"
[ -d "/root/imperial-factory/config" ] && echo "✅ Config dir exists" || echo "❌ Missing"

# 2. Verify files
[ -f "/root/imperial-factory/broker-service/go-brain/main.go" ] && echo "✅ main.go exists" || echo "❌ Missing"
[ -f "/root/imperial-factory/broker-service/go-brain/imperial-brain" ] && echo "✅ Binary exists" || echo "❌ Need to build"

# 3. Verify service
[ -f "/etc/systemd/system/imperial-brain.service" ] && echo "✅ Service file exists" || echo "❌ Need to install"

# 4. Check service config
grep "WorkingDirectory" /etc/systemd/system/imperial-brain.service | grep "broker-service/go-brain" && echo "✅ Correct path" || echo "❌ Wrong path"
```

## 📝 **Summary**

**Status:** ⚠️ **UNCERTAIN** - Need to verify on VPS

**Action Required:**
1. SSH to VPS: `ssh root@209.222.12.247`
2. Run verification commands above
3. If files missing, upload and deploy
4. If files exist, verify paths are correct
5. Run `verify-vps-setup.sh` for comprehensive check

**Files are ready locally** ✅
**Need to verify VPS status** ❓
