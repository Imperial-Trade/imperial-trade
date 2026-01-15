# VPS Deployment Checklist

## ✅ Issues Fixed in DEPLOY_NOW.sh

### 1. **Missing System Utilities**
- **Issue**: Script required `unzip` and `curl` but didn't install them
- **Fixed**: Added to apt-get install list

### 2. **PM2 Startup Command**
- **Issue**: PM2 startup outputs a command that needs to be executed, but script didn't run it
- **Fixed**: Now captures and executes the generated startup command automatically

### 3. **Private Repository Handling**
- **Issue**: No error handling if repository is private
- **Fixed**: Added detection and helpful instructions for setting up GitHub authentication

### 4. **Build Validation**
- **Issue**: No verification that build actually succeeded
- **Fixed**: Added checks for dist/index.js existence after build

### 5. **Error Messages**
- **Issue**: Generic errors without helpful context
- **Fixed**: Added descriptive error messages with troubleshooting hints

---

## 📋 Pre-Deployment Checklist

### On Your Local Machine:

- [ ] Verify your GitHub repository is accessible (public or have auth token ready)
- [ ] Confirm branch `claude/vultr-vps-setup-EiwkZ` exists
- [ ] Ensure `vps-broker-service.zip` or `vps-broker-service/` directory is in the repo

### On Your VPS (209.222.12.247):

- [ ] Can SSH into the server: `ssh root@209.222.12.247`
- [ ] Server is Ubuntu/Debian based (script uses apt-get)
- [ ] Have root access
- [ ] Internet connection is working

---

## 🚀 Deployment Methods

### Method 1: One-Line Deployment (Recommended)
```bash
ssh root@209.222.12.247
bash <(curl -s https://raw.githubusercontent.com/Imperial-Trade/imperial-trade/claude/vultr-vps-setup-EiwkZ/vps-deployment/DEPLOY_NOW.sh)
```

### Method 2: Manual Download and Run
```bash
ssh root@209.222.12.247
curl -o deploy.sh https://raw.githubusercontent.com/Imperial-Trade/imperial-trade/claude/vultr-vps-setup-EiwkZ/vps-deployment/DEPLOY_NOW.sh
chmod +x deploy.sh
bash deploy.sh
```

### Method 3: If Repository is Private
```bash
ssh root@209.222.12.247

# Generate GitHub Personal Access Token first:
# https://github.com/settings/tokens (with repo access)

# Then clone manually
mkdir -p /opt/imperial-trade
cd /opt/imperial-trade
git clone -b claude/vultr-vps-setup-EiwkZ https://YOUR_TOKEN@github.com/Imperial-Trade/imperial-trade.git

# Run the deployment script from the repo
cd imperial-trade/vps-deployment
bash DEPLOY_NOW.sh
```

---

## ⚙️ What the Script Does

1. **System Setup** (5-10 minutes)
   - Updates system packages
   - Installs Node.js 20.x
   - Installs Python 3 and pip
   - Installs MetaTrader5 Python library
   - Installs PM2 for process management
   - Installs nginx web server
   - Installs git, unzip, curl

2. **Repository Clone**
   - Clones Imperial Trade repository
   - Checks out `claude/vultr-vps-setup-EiwkZ` branch

3. **Service Setup**
   - Extracts vps-broker-service
   - Generates secure API key
   - Configures environment variables
   - Installs Node.js dependencies
   - Builds TypeScript code

4. **Deployment**
   - Starts service with PM2
   - Configures auto-start on boot
   - Sets up nginx reverse proxy
   - Configures firewall (UFW)

5. **Testing**
   - Tests local connection (localhost:3000)
   - Tests external connection (209.222.12.247)

---

## 📝 After Deployment

### 1. Save Credentials
```bash
cat /root/imperial-trade-credentials.txt
```

Copy these values to your frontend `.env` file:
```env
VITE_VPS_BROKER_URL=http://209.222.12.247
VITE_VPS_API_KEY=<generated-key>
VITE_ENCRYPTION_SECRET=ImperialTrade_BrokerEncryption_2025_v1
```

### 2. Verify Service is Running
```bash
pm2 status
pm2 logs imperial-broker-service
curl http://209.222.12.247/health
```

### 3. Monitor the Service
```bash
# View live logs
pm2 logs imperial-broker-service

# View resource usage
pm2 monit

# Restart if needed
pm2 restart imperial-broker-service
```

---

## 🐛 Troubleshooting

### Service Won't Start
```bash
cd /opt/imperial-trade/imperial-trade/vps-broker-service
pm2 logs imperial-broker-service --lines 100
```

### Port Already in Use
```bash
lsof -i :3000
# Kill the process using: kill -9 <PID>
```

### Can't Access Externally
```bash
# Check nginx
systemctl status nginx
nginx -t

# Check firewall
ufw status

# Check if service is listening
netstat -tulpn | grep 3000
```

### Build Failures
```bash
cd /opt/imperial-trade/imperial-trade/vps-broker-service
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Repository Clone Failed
```bash
# If private repo, create GitHub Personal Access Token
# https://github.com/settings/tokens

# Clone with token
git clone -b claude/vultr-vps-setup-EiwkZ \
  https://YOUR_TOKEN@github.com/Imperial-Trade/imperial-trade.git
```

---

## 🔒 Security Recommendations

After successful deployment:

1. **Change SSH Password**
   ```bash
   passwd
   ```

2. **Set Up SSH Key Authentication**
   ```bash
   # On your local machine:
   ssh-copy-id root@209.222.12.247
   ```

3. **Disable Password Authentication** (after SSH keys work)
   ```bash
   nano /etc/ssh/sshd_config
   # Set: PasswordAuthentication no
   systemctl restart sshd
   ```

4. **Set Up SSL/HTTPS**
   ```bash
   apt-get install -y certbot python3-certbot-nginx
   certbot --nginx -d yourdomain.com
   ```

5. **Install Fail2Ban**
   ```bash
   apt-get install -y fail2ban
   systemctl enable fail2ban
   ```

6. **Regular Updates**
   ```bash
   apt-get update && apt-get upgrade -y
   ```

---

## 📞 Support

If deployment fails:
1. Check the error message carefully
2. Review the troubleshooting section above
3. Check logs: `pm2 logs imperial-broker-service`
4. Verify system requirements are met
5. Ensure GitHub repository is accessible

---

## ✅ Deployment Success Indicators

- ✅ Script completes without errors
- ✅ `curl http://209.222.12.247/health` returns `{"status":"healthy"}`
- ✅ `pm2 status` shows service as "online"
- ✅ Credentials saved to `/root/imperial-trade-credentials.txt`
- ✅ nginx is running: `systemctl status nginx`
- ✅ Firewall configured: `ufw status`
