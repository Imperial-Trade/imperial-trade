# VPS Deployment Package

Complete deployment package for setting up Imperial Trade MT5 Broker Service on Vultr VPS.

## 🚀 Quick Start

### Option 1: Automated Setup (Recommended)

1. **Upload the entire `vps-broker-service` directory to your VPS:**
   ```bash
   scp -r vps-broker-service root@209.222.12.247:/opt/imperial-trade/
   ```

2. **SSH into your VPS:**
   ```bash
   ssh root@209.222.12.247
   ```

3. **Run the setup script:**
   ```bash
   cd /opt/imperial-trade/vps-broker-service

   # Upload and run the setup-vps.sh script first
   bash setup-vps.sh

   # Then deploy the service
   bash deploy-service.sh
   ```

### Option 2: Manual Setup

Follow the detailed guide in `VPS_SETUP_GUIDE.md`

## 📁 Files Included

- **setup-vps.sh** - Initial VPS system setup (Node.js, Python, PM2, nginx)
- **deploy-service.sh** - Deploy and start the broker service
- **install-nginx.sh** - Configure nginx reverse proxy
- **nginx-config.conf** - nginx configuration file
- **VPS_SETUP_GUIDE.md** - Complete step-by-step guide

## 🔑 VPS Credentials

- **IP:** 209.222.12.247
- **Username:** root
- **Password:** eJ)3-BJ9p9RsF2S$

## ⚙️ Configuration Required

After uploading files, you must configure the `.env` file:

```env
PORT=3000
VPS_API_KEY=<generate-secure-random-key>
ENCRYPTION_SECRET=ImperialTrade_BrokerEncryption_2025_v1
```

**Generate a secure API key:**
```bash
openssl rand -hex 32
```

## 📋 Pre-Deployment Checklist

- [ ] Upload vps-broker-service directory to VPS
- [ ] Upload deployment scripts to VPS
- [ ] Run setup-vps.sh
- [ ] Configure .env file with secure credentials
- [ ] Run deploy-service.sh
- [ ] Configure nginx (optional)
- [ ] Test service endpoint: `curl http://209.222.12.247/health`
- [ ] Update frontend .env with VPS_BROKER_URL

## 🔗 Service Endpoints

Once deployed:

- **Health Check:** `http://209.222.12.247/health`
- **Test Connection:** `POST http://209.222.12.247/test-connection`
- **Fetch Trades:** `POST http://209.222.12.247/fetch-trades`

## 🛠️ Useful Commands

```bash
# Service management
pm2 status
pm2 logs imperial-broker-service
pm2 restart imperial-broker-service

# Test service
curl http://localhost:3000/health
curl http://209.222.12.247/health
```

## 📚 Full Documentation

See `VPS_SETUP_GUIDE.md` for:
- Detailed setup instructions
- Troubleshooting guide
- Security best practices
- SSL/HTTPS configuration
- Maintenance procedures

## 🔒 Security Notes

- Change default SSH password after first login
- Use SSH keys instead of password authentication
- Enable firewall (UFW)
- Set up SSL/HTTPS for production
- Use strong, random API keys
- Keep system and packages updated

## 🆘 Quick Troubleshooting

**Service won't start:**
```bash
pm2 logs imperial-broker-service
```

**Can't connect externally:**
```bash
ufw status
systemctl status nginx
```

**Port already in use:**
```bash
lsof -i :3000
```
