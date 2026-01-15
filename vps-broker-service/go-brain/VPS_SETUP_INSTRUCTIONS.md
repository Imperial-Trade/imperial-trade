# 🚀 VPS Setup Instructions for Imperial Brain

## VPS Information
- **IP Address:** 209.222.12.247
- **Username:** root
- **Password:** (provided separately)
- **SSH Key:** ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEn5mXQUF0SEaMhW47DpTrCBxqI8+yVTR+vIf6mLgfso

## Quick Setup Steps

### 1. Connect to VPS

**Using SSH Key (Recommended):**
```bash
ssh -i ~/.ssh/your_private_key root@209.222.12.247
```

**Using Password:**
```bash
ssh root@209.222.12.247
```

### 2. Upload Files

From your local machine, upload the Go Brain files:

```bash
# From your local project directory
scp -r vps-broker-service/go-brain/* root@209.222.12.247:/root/imperial-factory/broker-service/go-brain/
```

Or use an SFTP client like FileZilla, WinSCP, or VS Code Remote.

### 3. Run Deployment Script

On the VPS:
```bash
cd /root/imperial-factory/broker-service/go-brain
chmod +x deploy-to-vps.sh
./deploy-to-vps.sh
```

### 4. Verify Setup

```bash
cd /root/imperial-factory/broker-service/go-brain
chmod +x verify-vps-setup.sh
./verify-vps-setup.sh
```

### 5. Start the Service

```bash
# Start the service
sudo systemctl start imperial-brain

# Enable auto-start on boot
sudo systemctl enable imperial-brain

# Check status
sudo systemctl status imperial-brain

# View logs
sudo journalctl -u imperial-brain -f
```

## Manual Setup (Alternative)

If the deployment script doesn't work, follow these steps:

### Step 1: Create Directories
```bash
mkdir -p /root/imperial-factory/broker-service/go-brain
mkdir -p /root/imperial-factory/config
mkdir -p /root/imperial-factory/mt5-master
```

### Step 2: Install Go (if not installed)
```bash
apt-get update
apt-get install -y golang-go
```

### Step 3: Build the Binary
```bash
cd /root/imperial-factory/broker-service/go-brain
go mod download
go build -o imperial-brain main.go
chmod +x imperial-brain
```

### Step 4: Install Systemd Service
```bash
cp imperial-brain.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable imperial-brain
systemctl start imperial-brain
```

### Step 5: Verify Installation
```bash
systemctl status imperial-brain
journalctl -u imperial-brain -f
```

## Configuration Files

### Systemd Service File
Location: `/etc/systemd/system/imperial-brain.service`

**Key Configuration:**
- `WorkingDirectory`: `/root/imperial-factory/broker-service/go-brain`
- `ExecStart`: `/root/imperial-factory/broker-service/go-brain/imperial-brain`
- `DATABASE_URL`: Supabase pooler connection
- `LISTENER_DATABASE_URL`: Direct connection for LISTEN/NOTIFY
- `ENCRYPTION_SECRET`: `ImperialTrade_BrokerEncryption_2025_v1`

### Directory Structure
```
/root/imperial-factory/
├── broker-service/
│   └── go-brain/
│       ├── main.go
│       ├── go.mod
│       ├── imperial-brain (binary)
│       ├── imperial-brain.service
│       └── entrypoint.sh
├── config/
│   └── launch_{connID}.ini (generated dynamically)
└── mt5-master/
    ├── Dockerfile
    └── terminal64.exe (MT5 files)
```

## Troubleshooting

### Service Won't Start
```bash
# Check logs
sudo journalctl -u imperial-brain -n 50

# Check if binary exists and is executable
ls -la /root/imperial-factory/broker-service/go-brain/imperial-brain
chmod +x /root/imperial-factory/broker-service/go-brain/imperial-brain
```

### Database Connection Issues
```bash
# Test database connection manually
export DATABASE_URL="postgres://postgres.kmuoqkcxguafxulqlbmi:Tradeimperial%40315@aws-0-us-west-1.pooler.supabase.com:6543/postgres?sslmode=require"
psql "$DATABASE_URL" -c "SELECT 1;"
```

### Docker Issues
```bash
# Check Docker status
systemctl status docker

# Check if image exists
docker images | grep imperial-mt5-worker

# Build image if missing
# (Follow Docker image build instructions separately)
```

### Permission Issues
```bash
# Ensure directories are owned by root
chown -R root:root /root/imperial-factory/
chmod +x /root/imperial-factory/broker-service/go-brain/imperial-brain
```

## Monitoring

### View Real-time Logs
```bash
sudo journalctl -u imperial-brain -f
```

### Check Service Status
```bash
sudo systemctl status imperial-brain
```

### View Recent Logs
```bash
sudo journalctl -u imperial-brain -n 100
```

### Check Active Containers
```bash
docker ps | grep worker_
```

## Security Notes

1. **SSH Key Authentication**: Prefer SSH key authentication over password
2. **Firewall**: Ensure ports 22 (SSH), 80, 443 are open if needed
3. **Credentials**: Database credentials are in the systemd service file - ensure it's secured
4. **File Permissions**: Ensure config files are readable only by root

## Performance Tuning

### System Resources
- **RAM**: Ensure sufficient RAM for Docker containers (at least 2GB recommended)
- **CPU**: Multi-core recommended for concurrent workers
- **Disk**: Monitor disk space for container logs and config files

### Go Brain Settings
Edit `/root/imperial-factory/broker-service/go-brain/main.go` constants:
- `MAX_WORKERS`: Maximum concurrent containers (default: 400)
- `SYNC_CHECK_INTERVAL`: How often to check sync status (default: 1s for instant mode)
- `CONTAINER_MAX_LIFETIME`: Maximum container lifetime (default: 10 minutes)

## Updates

To update the service:

```bash
# Stop service
sudo systemctl stop imperial-brain

# Backup current binary
cp /root/imperial-factory/broker-service/go-brain/imperial-brain /root/imperial-factory/broker-service/go-brain/imperial-brain.backup

# Upload new files and rebuild
cd /root/imperial-factory/broker-service/go-brain
go build -o imperial-brain main.go

# Restart service
sudo systemctl start imperial-brain
```

## Support

If you encounter issues:
1. Check logs: `journalctl -u imperial-brain -f`
2. Verify setup: `./verify-vps-setup.sh`
3. Check database connectivity
4. Verify Docker is running and image exists
