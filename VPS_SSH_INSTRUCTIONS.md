# VPS SSH Instructions - Go Brain Update

## SSH Connection

**Connection Details:**
- Host: 209.222.12.247
- User: root
- Authentication: Password

## Option 1: Manual SSH (Recommended)

**From Terminal:**
```bash
ssh root@209.222.12.247
# Enter password: eJ)3-BJ9p9RsF2S$
```

**Once connected, run:**
```bash
# Navigate to go-brain directory
cd /root/vps-broker-service/go-brain

# Verify you're in the right place
ls -la main.go

# Rebuild the binary
go build -o go-brain main.go

# Check if service exists
systemctl list-unit-files | grep go-brain

# Stop service (if exists)
sudo systemctl stop go-brain

# Start service (if exists)
sudo systemctl start go-brain

# OR if no service, run directly:
# nohup ./go-brain > go-brain.log 2>&1 &

# Check status
sudo systemctl status go-brain

# View logs
journalctl -u go-brain -f
# OR
tail -f go-brain.log
```

## Option 2: Using Deployment Script

**Upload script to VPS:**
```bash
# From your Mac (in project directory)
scp VPS_DEPLOY_SCRIPT.sh root@209.222.12.247:/root/

# SSH into VPS
ssh root@209.222.12.247

# Run script
chmod +x /root/VPS_DEPLOY_SCRIPT.sh
/root/VPS_DEPLOY_SCRIPT.sh
```

## Option 3: Direct Commands (Copy-Paste)

Once SSH'd in, copy and paste this block:

```bash
cd /root/vps-broker-service/go-brain && \
go build -o go-brain main.go && \
sudo systemctl stop go-brain 2>/dev/null; \
sudo systemctl start go-brain 2>/dev/null || \
(nohup ./go-brain > go-brain.log 2>&1 &) && \
echo "✅ Go Brain rebuilt and started"
```

---

## Troubleshooting

### SSH Password Not Working
- Verify password: `eJ)3-BJ9p9RsF2S$`
- Try: `ssh -o PreferredAuthentications=password root@209.222.12.247`

### Go Not Found
```bash
which go
# If not found, install: apt-get update && apt-get install -y golang-go
```

### Directory Not Found
```bash
find /root -name "main.go" -path "*/go-brain/*"
find /root -name "go-brain" -type d
```

### Service Not Found
If systemd service doesn't exist, the Go Brain might be running manually. Check:
```bash
ps aux | grep go-brain
```

---

**After deployment, verify:**
- ✅ Go Brain binary rebuilt
- ✅ Service running (or process running)
- ✅ No errors in logs
- ✅ Can connect to database
