# VPS Setup Execution Guide

## ✅ SSH Key Setup (LOCAL - Completed)

SSH key has been configured on your local machine:
- Key saved to: `~/.ssh/vultr_vps_key`
- SSH config updated: `~/.ssh/config`
- You can connect using: `ssh vultr-vps`

## 🚀 VPS Setup Options

### Option 1: Automated Setup (Recommended)

If SSH key authentication works, run:

```bash
cd "/Users/nthny_11/Trade imperial GITHUB /nov 7 notif project/imperial-trade"

# Copy setup script to VPS
scp -i ~/.ssh/vultr_vps_key scripts/vps-setup-foundation.sh root@209.222.12.247:/root/

# Execute setup script
ssh -i ~/.ssh/vultr_vps_key root@209.222.12.247 "chmod +x /root/vps-setup-foundation.sh && bash /root/vps-setup-foundation.sh"
```

### Option 2: Manual Setup (If SSH key doesn't work)

Connect to VPS using password:

```bash
ssh root@209.222.12.247
# Password: eJ)3-BJ9p9RsF2S$
```

Then copy and paste this entire script:

```bash
# Update system
apt update && apt upgrade -y

# Install Docker
apt install docker.io -y
systemctl enable --now docker
systemctl start docker

# Install Go
apt install golang-go -y

# Install Wine and Xvfb
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
```

### Option 3: Interactive Setup Script

1. Copy the setup script to VPS:
```bash
scp scripts/vps-setup-foundation.sh root@209.222.12.247:/root/
```

2. SSH into VPS:
```bash
ssh root@209.222.12.247
# Password: eJ)3-BJ9p9RsF2S$
```

3. Run the script:
```bash
chmod +x /root/vps-setup-foundation.sh
bash /root/vps-setup-foundation.sh
```

## ✅ Verification

After setup completes, verify installations:

```bash
# Option 1: Run verification script
scp scripts/verify-vps-setup.sh root@209.222.12.247:/root/
ssh root@209.222.12.247 "bash /root/verify-vps-setup.sh"

# Option 2: Manual verification
ssh root@209.222.12.247
docker --version
go version
wine --version
ls -la /root/imperial-factory/
```

## 📋 What Gets Installed

- **Docker**: Container runtime for MT5 workers
- **Go (Golang)**: For the Brain orchestrator
- **Wine**: Windows compatibility layer for MT5
- **Xvfb**: Virtual framebuffer for headless GUI
- **Directory Structure**: 
  - `/root/imperial-factory/mt5-master/` - MT5 and Dockerfile
  - `/root/imperial-factory/brain/` - Go Brain source
  - `/root/imperial-factory/config/` - Configuration files

## 🔧 Troubleshooting

### SSH Key Authentication Failed
- Use password authentication (Option 2 or 3)
- Password: `eJ)3-BJ9p9RsF2S$`

### Docker Service Not Running
```bash
systemctl start docker
systemctl enable docker
```

### Go Not Found
```bash
apt install golang-go -y
```

### Wine Installation Issues
```bash
dpkg --add-architecture i386
apt update
apt install wine64 wine32:i386 -y
```

## 📝 Next Steps After Setup

1. ✅ Verify all installations
2. Copy Dockerfile to `/root/imperial-factory/mt5-master/`
3. Download MT5 installation files
4. Build Docker image
5. Set up Go Brain
