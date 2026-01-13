#!/bin/bash
# Automated VPS Deployment Script for MT5 Broker Service
# Run this from your LOCAL MACHINE (not from the Claude environment)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# VPS Configuration
VPS_HOST="209.222.12.247"
VPS_USER="root"
VPS_PASS="eJ)3-BJ9p9RsF2S$"
GITHUB_TOKEN="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"
BRANCH="claude/broker-autosync-journal-WO5Cw"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  MT5 Broker Service VPS Deployment${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Function to run command on VPS
run_vps() {
    sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no "$VPS_USER@$VPS_HOST" "$1"
}

# Function to check if command exists on VPS
command_exists() {
    run_vps "command -v $1 &> /dev/null && echo 'exists' || echo 'missing'"
}

# Step 1: Check SSH connectivity
echo -e "${YELLOW}[1/14]${NC} Testing SSH connection..."
if sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 "$VPS_USER@$VPS_HOST" "echo 'Connection successful'" &> /dev/null; then
    echo -e "${GREEN}✓${NC} SSH connection successful"
else
    echo -e "${RED}✗${NC} Failed to connect to VPS. Please check:"
    echo "  - VPS is online"
    echo "  - Firewall allows SSH (port 22)"
    echo "  - Credentials are correct"
    echo ""
    echo "Install sshpass if needed: sudo apt-get install sshpass (Linux) or brew install hudochenkov/sshpass/sshpass (Mac)"
    exit 1
fi

# Step 2: Check/Install Node.js
echo -e "${YELLOW}[2/14]${NC} Checking Node.js installation..."
NODE_CHECK=$(run_vps "command -v node &> /dev/null && echo 'exists' || echo 'missing'")
if [[ "$NODE_CHECK" == *"missing"* ]]; then
    echo -e "${YELLOW}Installing Node.js 18.x...${NC}"
    run_vps "curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && apt-get install -y nodejs"
    echo -e "${GREEN}✓${NC} Node.js installed"
else
    NODE_VERSION=$(run_vps "node --version")
    echo -e "${GREEN}✓${NC} Node.js already installed: $NODE_VERSION"
fi

# Step 3: Check/Install Python MetaTrader5
echo -e "${YELLOW}[3/14]${NC} Installing Python MetaTrader5..."
run_vps "pip3 install MetaTrader5 --upgrade 2>&1 | tail -1"
echo -e "${GREEN}✓${NC} Python MetaTrader5 library ready"

# Step 4: Check if repository exists
echo -e "${YELLOW}[4/14]${NC} Checking repository..."
REPO_EXISTS=$(run_vps "[ -d /root/imperial-trade/.git ] && echo 'exists' || echo 'missing'")

if [[ "$REPO_EXISTS" == *"exists"* ]]; then
    echo -e "${YELLOW}Repository exists, pulling latest changes...${NC}"
    run_vps "cd /root/imperial-trade && git fetch origin && git checkout $BRANCH && git pull origin $BRANCH"
    echo -e "${GREEN}✓${NC} Repository updated"
else
    echo -e "${YELLOW}Cloning repository...${NC}"
    run_vps "cd /root && git clone -b $BRANCH https://${GITHUB_TOKEN}@github.com/Imperial-Trade/imperial-trade.git"
    echo -e "${GREEN}✓${NC} Repository cloned"
fi

# Step 5: Install npm dependencies
echo -e "${YELLOW}[5/14]${NC} Installing npm dependencies..."
run_vps "cd /root/imperial-trade/vps-broker-service && npm install --production" 2>&1 | tail -5
echo -e "${GREEN}✓${NC} Dependencies installed"

# Step 6: Build TypeScript
echo -e "${YELLOW}[6/14]${NC} Building TypeScript..."
run_vps "cd /root/imperial-trade/vps-broker-service && npm run build" 2>&1 | tail -3
echo -e "${GREEN}✓${NC} Build complete"

# Step 7: Create .env file
echo -e "${YELLOW}[7/14]${NC} Creating .env configuration..."
run_vps "cat > /root/imperial-trade/vps-broker-service/.env << 'EOF'
PORT=3000
VPS_API_KEY=Imperial_VPS_Secret_2026
ENCRYPTION_SECRET=ImperialTrade_BrokerEncryption_2025_v1
EOF"
echo -e "${GREEN}✓${NC} Configuration created"

# Step 8: Install PM2
echo -e "${YELLOW}[8/14]${NC} Installing PM2..."
PM2_CHECK=$(run_vps "command -v pm2 &> /dev/null && echo 'exists' || echo 'missing'")
if [[ "$PM2_CHECK" == *"missing"* ]]; then
    run_vps "npm install -g pm2"
    echo -e "${GREEN}✓${NC} PM2 installed"
else
    echo -e "${GREEN}✓${NC} PM2 already installed"
fi

# Step 9: Stop existing service
echo -e "${YELLOW}[9/14]${NC} Stopping existing service..."
run_vps "pm2 delete imperial-broker-service 2>/dev/null || true"
echo -e "${GREEN}✓${NC} Old service stopped"

# Step 10: Start service
echo -e "${YELLOW}[10/14]${NC} Starting imperial-broker-service..."
run_vps "cd /root/imperial-trade/vps-broker-service && pm2 start dist/index.js --name imperial-broker-service"
echo -e "${GREEN}✓${NC} Service started"

# Step 11: Save PM2 config
echo -e "${YELLOW}[11/14]${NC} Saving PM2 configuration..."
run_vps "pm2 save"
echo -e "${GREEN}✓${NC} PM2 config saved"

# Step 12: Setup PM2 startup
echo -e "${YELLOW}[12/14]${NC} Setting up PM2 startup script..."
run_vps "pm2 startup systemd -u root --hp /root 2>&1 | tail -1"
echo -e "${GREEN}✓${NC} Startup script configured"

# Step 13: Open firewall port
echo -e "${YELLOW}[13/14]${NC} Configuring firewall..."
run_vps "ufw allow 3000/tcp 2>/dev/null || true"
echo -e "${GREEN}✓${NC} Port 3000 opened"

# Step 14: Verify service
echo -e "${YELLOW}[14/14]${NC} Verifying service..."
sleep 3
HEALTH_CHECK=$(run_vps "curl -s http://localhost:3000/health")
if [[ "$HEALTH_CHECK" == *"imperial-trade-broker-service"* ]]; then
    echo -e "${GREEN}✓${NC} Service is running correctly!"
    echo ""
    echo -e "${GREEN}Health check response:${NC}"
    echo "$HEALTH_CHECK" | jq . || echo "$HEALTH_CHECK"
else
    echo -e "${RED}✗${NC} Service health check failed"
    echo "Checking logs..."
    run_vps "pm2 logs imperial-broker-service --lines 20 --nostream"
    exit 1
fi

# Final status
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Deployment Successful! 🎉${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Service Information:${NC}"
echo "  URL: http://209.222.12.247:3000"
echo "  Status: Running"
echo "  Process: imperial-broker-service (PM2)"
echo ""
echo -e "${YELLOW}Useful Commands:${NC}"
echo "  View logs: ssh root@209.222.12.247 'pm2 logs imperial-broker-service'"
echo "  Restart: ssh root@209.222.12.247 'pm2 restart imperial-broker-service'"
echo "  Status: ssh root@209.222.12.247 'pm2 status'"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Configure Supabase secrets (see NEXT_STEPS.md)"
echo "  2. Test from frontend at tradeimperial.com"
echo ""
