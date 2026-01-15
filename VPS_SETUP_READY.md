# ✅ VPS Setup Scripts Ready!

## 📁 Created Files

1. ✅ `scripts/vps-setup-foundation.sh` - Main VPS setup script
2. ✅ `scripts/vps-setup-with-password.sh` - Automated setup (uses sshpass)
3. ✅ `scripts/verify-vps-setup.sh` - Verification script
4. ✅ `scripts/setup-ssh-key.sh` - SSH key setup (local)
5. ✅ `VPS_SETUP_COMPLETE_GUIDE.md` - Complete guide with all options

## 🚀 Quick Start

### Easiest Method (Manual):

1. **Connect to VPS:**
   ```bash
   ssh root@209.222.12.247
   # Password: eJ)3-BJ9p9RsF2S$
   ```

2. **Copy and paste this script:**
   ```bash
   apt update && apt upgrade -y && \
   apt install docker.io golang-go wine64 wine32:i386 xvfb unzip wget -y && \
   systemctl enable --now docker && \
   dpkg --add-architecture i386 && apt update && \
   mkdir -p /root/imperial-factory/{mt5-master,brain,config,logs} && \
   docker --version && go version && wine --version
   ```

3. **Verify:**
   ```bash
   docker ps
   ls -la /root/imperial-factory/
   ```

## 📋 What Gets Installed

- Docker (container runtime)
- Go (Golang)
- Wine + Xvfb (headless MT5 support)
- Directory structure for Imperial Factory

## ✅ Next Steps After Setup

1. Verify installations
2. Copy Dockerfile to VPS
3. Build Docker image
4. Set up Go Brain
5. Compile and upload MQL5 EA

See `VPS_SETUP_COMPLETE_GUIDE.md` for detailed instructions!
