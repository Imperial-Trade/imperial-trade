# 🚀 VPS Setup Complete Guide

**VPS Details:**
- IP: `209.222.12.247`
- User: `root`
- Password: `eJ)3-BJ9p9RsF2S$`

---

## ✅ Option 1: Automated Setup (Recommended)

### Install sshpass (if not installed)

**macOS:**
```bash
brew install hudochenkov/sshpass/sshpass
```

**Linux:**
```bash
sudo apt-get install sshpass
# or
sudo yum install sshpass
```

### Run Automated Setup

```bash
cd "/Users/nthny_11/Trade imperial GITHUB /nov 7 notif project/imperial-trade"
chmod +x scripts/vps-setup-with-password.sh
./scripts/vps-setup-with-password.sh
```

---

## ✅ Option 2: Manual Setup (Step-by-Step)

### Step 1: Connect to VPS

```bash
ssh root@209.222.12.247
# Password: eJ)3-BJ9p9RsF2S$
```

### Step 2: Copy and Paste This Complete Setup Script

Once connected, paste this entire block:

```bash
# Update system
apt update && apt upgrade -y

# Install Docker
apt install docker.io -y
systemctl enable --now docker
systemctl start docker

# Install Go
apt install golang-go -y

# Install Wine and Xvfb (for headless MT5)
dpkg --add-architecture i386
apt update
apt install wine64 wine32:i386 xvfb unzip wget -y

# Create directory structure
mkdir -p /root/imperial-factory/mt5-master
mkdir -p /root/imperial-factory/brain
mkdir -p /root/imperial-factory/config
mkdir -p /root/imperial-factory/logs

# Verify installations
echo "=== Verification ==="
docker --version
go version
wine --version
Xvfb -help 2>&1 | head -1
ls -la /root/imperial-factory/
echo ""
echo "✅ Setup complete!"
```

### Step 3: Verify Setup

Run these commands to verify:

```bash
docker ps
go version
wine --version
ls -la /root/imperial-factory/
```

---

## ✅ Option 3: Copy Script and Run Manually

### Step 1: Copy Script to VPS

From your local machine:

```bash
cd "/Users/nthny_11/Trade imperial GITHUB /nov 7 notif project/imperial-trade"

# Copy using scp (will prompt for password)
scp scripts/vps-setup-foundation.sh root@209.222.12.247:/root/
# Password: eJ)3-BJ9p9RsF2S$
```

### Step 2: SSH and Execute

```bash
ssh root@209.222.12.247
# Password: eJ)3-BJ9p9RsF2S$

# Run the script
chmod +x /root/vps-setup-foundation.sh
bash /root/vps-setup-foundation.sh
```

---

## 📋 What Gets Installed

- ✅ **Docker** - Container runtime for MT5 workers
- ✅ **Go (Golang)** - For the Brain orchestrator  
- ✅ **Wine** - Windows compatibility layer for MT5
- ✅ **Xvfb** - Virtual framebuffer for headless GUI
- ✅ **Directory Structure:**
  - `/root/imperial-factory/mt5-master/` - MT5 and Dockerfile
  - `/root/imperial-factory/brain/` - Go Brain source
  - `/root/imperial-factory/config/` - Configuration files
  - `/root/imperial-factory/logs/` - Log files

---

## ✅ Verification Checklist

After setup, verify:

```bash
# Check Docker
docker --version
docker ps  # Should show empty list (no errors)

# Check Go
go version

# Check Wine
wine --version

# Check Xvfb
which Xvfb

# Check directories
ls -la /root/imperial-factory/
```

**Expected Output:**
- Docker version 20.x or higher
- Go version 1.18 or higher
- Wine version 5.x or higher
- Xvfb executable found
- All directories exist

---

## 🔧 Troubleshooting

### Docker Service Not Running

```bash
systemctl start docker
systemctl enable docker
systemctl status docker
```

### Go Not Found

```bash
apt install golang-go -y
export PATH=$PATH:/usr/local/go/bin
```

### Wine Installation Issues

```bash
dpkg --add-architecture i386
apt update
apt install --fix-broken
apt install wine64 wine32:i386 -y
```

### Permission Denied Errors

```bash
# Make sure you're running as root
whoami  # Should output: root

# If not root, use sudo
sudo -i
```

---

## 📝 Next Steps After VPS Setup

Once setup is complete:

1. ✅ **Verify all installations** (see checklist above)
2. **Copy Dockerfile** to `/root/imperial-factory/mt5-master/`
3. **Download MT5** installation files
4. **Build Docker image** (`imperial-worker`)
5. **Set up Go Brain** in `/root/imperial-factory/brain/`
6. **Compile MQL5 EA** and upload to VPS

---

## 📁 Files Created

- `scripts/vps-setup-foundation.sh` - Main setup script
- `scripts/vps-setup-with-password.sh` - Automated setup (with password)
- `scripts/verify-vps-setup.sh` - Verification script
- `scripts/setup-ssh-key.sh` - SSH key setup (local)
- `VPS_SETUP_COMPLETE_GUIDE.md` - This guide

---

## 🎯 Quick Start Command

**Fastest way to get started:**

```bash
cd "/Users/nthny_11/Trade imperial GITHUB /nov 7 notif project/imperial-trade"
ssh root@209.222.12.247
# Password: eJ)3-BJ9p9RsF2S$
```

Then paste the setup script from Option 2 above.
