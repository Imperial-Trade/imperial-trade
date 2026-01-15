# Imperial Trade - VPS Setup Guide

Complete guide for setting up the MT5 Broker Service on your Vultr VPS.

## VPS Details

- **IP Address:** 209.222.12.247
- **Username:** root
- **OS:** Ubuntu/Debian (assumed)

## Prerequisites

- SSH client (Terminal on Mac/Linux, PuTTY on Windows)
- The vps-broker-service files from this repository

## Step-by-Step Setup

### Step 1: Connect to VPS via SSH

```bash
ssh root@209.222.12.247
# Enter password when prompted: eJ)3-BJ9p9RsF2S$
```

Or using the SSH key:
```bash
ssh -i /path/to/vultr-vps-key root@209.222.12.247
```

### Step 2: Initial System Setup

Once connected, run the system setup script:

```bash
# Download setup script
curl -o setup-vps.sh https://raw.githubusercontent.com/[your-repo]/main/vps-deployment/setup-vps.sh

# Or manually create it and paste the content from setup-vps.sh

# Make it executable
chmod +x setup-vps.sh

# Run the setup
sudo bash setup-vps.sh
```

This will:
- Update system packages
- Install Node.js 20.x
- Install Python 3 and pip
- Install MetaTrader5 Python library
- Install PM2 for process management
- Install nginx for reverse proxy
- Create application directory at `/opt/imperial-trade`

### Step 3: Upload Service Files

From your local machine, upload the service files to the VPS:

```bash
# Using SCP
scp -r vps-broker-service root@209.222.12.247:/opt/imperial-trade/

# Or using rsync (recommended)
rsync -avz vps-broker-service/ root@209.222.12.247:/opt/imperial-trade/vps-broker-service/
```

### Step 4: Configure Environment Variables

SSH back into the VPS and configure the service:

```bash
ssh root@209.222.12.247
cd /opt/imperial-trade/vps-broker-service

# Create .env file
cp .env.example .env
nano .env
```

Update the `.env` file with your actual values:

```env
PORT=3000
VPS_API_KEY=your-secure-api-key-here
ENCRYPTION_SECRET=ImperialTrade_BrokerEncryption_2025_v1
```

**Important:**
- Use a strong, random API key (e.g., generate one with `openssl rand -hex 32`)
- The `ENCRYPTION_SECRET` must match the one in your frontend `.env` file
- Store the API key securely and add it to your Supabase environment variables

### Step 5: Deploy the Service

```bash
# Make deploy script executable
chmod +x deploy-service.sh

# Run deployment
bash deploy-service.sh
```

This will:
- Install npm dependencies
- Build TypeScript code
- Start the service with PM2
- Configure PM2 to start on boot

### Step 6: Configure nginx Reverse Proxy (Optional but Recommended)

```bash
# Make nginx script executable
chmod +x install-nginx.sh

# Run nginx setup
sudo bash install-nginx.sh
```

### Step 7: Configure Firewall

```bash
# Allow SSH, HTTP, and HTTPS
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp

# If nginx is not used, allow direct access to port 3000
# ufw allow 3000/tcp

# Enable firewall
ufw enable
```

### Step 8: Test the Service

```bash
# Test locally on VPS
curl http://localhost:3000/health

# Test from external network
curl http://209.222.12.247/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "Imperial Trade Broker Service",
  "timestamp": "2026-01-15T01:00:00.000Z"
}
```

## Post-Deployment

### Update Frontend Configuration

Update your frontend `.env` file with the VPS URL:

```env
VITE_VPS_BROKER_URL=http://209.222.12.247
VITE_VPS_API_KEY=your-secure-api-key-here
VITE_ENCRYPTION_SECRET=ImperialTrade_BrokerEncryption_2025_v1
```

### Install MT5 Terminal (If Required)

Some brokers may require MT5 terminal to be installed on the VPS:

```bash
# This typically requires a Windows VPS
# For Linux VPS, you may need Wine or use the Python MetaTrader5 library
```

**Note:** The current setup uses the Python MetaTrader5 library which works on Linux without requiring the full MT5 terminal.

### Monitor the Service

```bash
# View logs
pm2 logs imperial-broker-service

# Check status
pm2 status

# View detailed info
pm2 info imperial-broker-service

# Monitor resources
pm2 monit
```

### Restart the Service

```bash
# Restart service
pm2 restart imperial-broker-service

# Reload service (zero-downtime)
pm2 reload imperial-broker-service
```

## SSL/HTTPS Setup (Recommended for Production)

```bash
# Install Certbot
apt-get install -y certbot python3-certbot-nginx

# Get SSL certificate (replace with your domain)
certbot --nginx -d yourdomain.com

# Certbot will automatically configure nginx
```

## Troubleshooting

### Service won't start
```bash
# Check logs
pm2 logs imperial-broker-service

# Check if port is in use
lsof -i :3000

# Restart PM2
pm2 restart imperial-broker-service
```

### Can't connect from external network
```bash
# Check firewall
ufw status

# Check nginx status
systemctl status nginx

# Check if service is listening
netstat -tulpn | grep 3000
```

### Python MetaTrader5 errors
```bash
# Reinstall MetaTrader5 library
pip3 uninstall MetaTrader5
pip3 install MetaTrader5

# Check Python version
python3 --version
```

## Maintenance

### Update Service Code

```bash
# On local machine, upload new files
rsync -avz vps-broker-service/ root@209.222.12.247:/opt/imperial-trade/vps-broker-service/

# On VPS, rebuild and restart
ssh root@209.222.12.247
cd /opt/imperial-trade/vps-broker-service
npm run build
pm2 restart imperial-broker-service
```

### Backup Configuration

```bash
# Backup .env file
cp /opt/imperial-trade/vps-broker-service/.env ~/imperial-trade-env-backup.txt
```

### System Updates

```bash
# Update system packages regularly
apt-get update
apt-get upgrade -y

# Update Node.js packages
cd /opt/imperial-trade/vps-broker-service
npm update
npm audit fix
```

## Security Best Practices

1. **Change default SSH port**
2. **Use SSH keys instead of passwords**
3. **Enable fail2ban** to prevent brute force attacks
4. **Keep system and packages updated**
5. **Use strong API keys**
6. **Enable HTTPS with SSL certificate**
7. **Regularly monitor logs**
8. **Set up automatic backups**

## Support

For issues or questions:
- Check the logs: `pm2 logs imperial-broker-service`
- Review the README in vps-broker-service directory
- Check GitHub issues

## Quick Command Reference

```bash
# Service management
pm2 status                              # Check service status
pm2 logs imperial-broker-service        # View logs
pm2 restart imperial-broker-service     # Restart service
pm2 stop imperial-broker-service        # Stop service
pm2 start imperial-broker-service       # Start service

# System
systemctl status nginx                  # Check nginx status
systemctl restart nginx                 # Restart nginx
ufw status                              # Check firewall

# Testing
curl http://localhost:3000/health       # Test locally
curl http://209.222.12.247/health       # Test externally
```
