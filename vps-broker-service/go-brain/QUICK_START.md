# ⚡ Quick Start - Deploy to VPS

## Your VPS Details
- **IP:** 209.222.12.247
- **User:** root
- **Path:** `/root/imperial-factory/broker-service/go-brain`

## Step 1: Connect to VPS

```bash
ssh root@209.222.12.247
# Enter password when prompted
```

## Step 2: Create Directories

```bash
mkdir -p /root/imperial-factory/broker-service/go-brain
mkdir -p /root/imperial-factory/config
mkdir -p /root/imperial-factory/mt5-master
```

## Step 3: Upload Files

**From your local machine**, upload the Go Brain files:

```bash
# Navigate to your project directory first
cd "/Users/nthny_11/Trade imperial GITHUB /nov 7 notif project/imperial-trade"

# Upload all Go Brain files
scp vps-broker-service/go-brain/* root@209.222.12.247:/root/imperial-factory/broker-service/go-brain/
```

Or use **WinSCP/FileZilla**:
- **Host:** 209.222.12.247
- **User:** root
- **Password:** (your password)
- **Port:** 22
- **Remote Path:** `/root/imperial-factory/broker-service/go-brain`

## Step 4: Run Deployment

**On the VPS:**

```bash
cd /root/imperial-factory/broker-service/go-brain
chmod +x *.sh
./deploy-to-vps.sh
```

## Step 5: Start Service

```bash
systemctl start imperial-brain
systemctl enable imperial-brain
systemctl status imperial-brain
```

## Step 6: View Logs

```bash
journalctl -u imperial-brain -f
```

You should see:
```
[INSTANT] ⚡ Imperial Brain Online - INSTANT/REALTIME MODE ENABLED
[INSTANT] ⚡ Realtime connected - receiving INSTANT notifications (<100ms latency)
```

## Verify Everything Works

```bash
./verify-vps-setup.sh
./test-connection.sh
```

## Common Commands

```bash
# Start service
systemctl start imperial-brain

# Stop service
systemctl stop imperial-brain

# Restart service
systemctl restart imperial-brain

# View logs (real-time)
journalctl -u imperial-brain -f

# View recent logs
journalctl -u imperial-brain -n 100

# Check status
systemctl status imperial-brain

# Check Docker containers
docker ps | grep worker_
```

## Troubleshooting

### Service won't start?
```bash
journalctl -u imperial-brain -n 50
```

### Database connection error?
```bash
./test-connection.sh
```

### Binary not found?
```bash
cd /root/imperial-factory/broker-service/go-brain
go build -o imperial-brain main.go
chmod +x imperial-brain
```
