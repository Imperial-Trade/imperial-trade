#!/bin/bash

#################################################
# Imperial Trade - One-Command VPS Deployment
#
# Copy this entire script and run it on your VPS
# Usage: bash <(curl -s URL) or save and run directly
#################################################

set -e

echo "================================"
echo "Imperial Trade VPS Deployment"
echo "Starting at: $(date)"
echo "================================"
echo ""

# Function to check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        echo "This script needs root privileges. Trying with sudo..."
        exec sudo bash "$0" "$@"
    fi
}

# Step 1: System Setup
setup_system() {
    echo "[STEP 1/7] Setting up system..."

    apt-get update -y
    apt-get upgrade -y

    # Install Node.js 20.x
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs

    # Install Python and pip
    echo "Installing Python..."
    apt-get install -y python3 python3-pip

    # Install MetaTrader5
    echo "Installing MetaTrader5 Python library..."
    pip3 install MetaTrader5

    # Install PM2
    echo "Installing PM2..."
    npm install -g pm2

    # Install nginx
    echo "Installing nginx..."
    apt-get install -y nginx

    # Install git
    apt-get install -y git

    echo "✓ System setup complete"
}

# Step 2: Clone Repository
clone_repo() {
    echo ""
    echo "[STEP 2/7] Cloning repository..."

    mkdir -p /opt/imperial-trade
    cd /opt/imperial-trade

    # Check if repo already exists
    if [ -d "imperial-trade/.git" ]; then
        echo "Repository already exists, pulling latest changes..."
        cd imperial-trade
        git pull origin claude/vultr-vps-setup-EiwkZ
    else
        echo "Cloning repository..."
        git clone -b claude/vultr-vps-setup-EiwkZ https://github.com/Imperial-Trade/imperial-trade.git
        cd imperial-trade
    fi

    echo "✓ Repository cloned"
}

# Step 3: Extract VPS Service
extract_service() {
    echo ""
    echo "[STEP 3/7] Extracting VPS broker service..."

    cd /opt/imperial-trade/imperial-trade

    if [ -f "vps-broker-service.zip" ]; then
        unzip -o vps-broker-service.zip
        echo "✓ Service extracted"
    else
        echo "✓ Service already extracted"
    fi
}

# Step 4: Configure Environment
configure_env() {
    echo ""
    echo "[STEP 4/7] Configuring environment..."

    cd /opt/imperial-trade/imperial-trade/vps-broker-service

    if [ ! -f ".env" ]; then
        cp .env.example .env

        # Generate secure API key
        API_KEY=$(openssl rand -hex 32)

        # Update .env file
        sed -i "s/your-secure-api-key-here/${API_KEY}/" .env

        echo ""
        echo "════════════════════════════════════════"
        echo "IMPORTANT: Save these credentials!"
        echo "════════════════════════════════════════"
        echo "VPS_API_KEY=${API_KEY}"
        echo "ENCRYPTION_SECRET=ImperialTrade_BrokerEncryption_2025_v1"
        echo ""
        echo "Add these to your frontend .env file:"
        echo "VITE_VPS_BROKER_URL=http://209.222.12.247"
        echo "VITE_VPS_API_KEY=${API_KEY}"
        echo "VITE_ENCRYPTION_SECRET=ImperialTrade_BrokerEncryption_2025_v1"
        echo "════════════════════════════════════════"
        echo ""

        # Save to a file for reference
        cat > /root/imperial-trade-credentials.txt <<EOF
Imperial Trade VPS Credentials
Generated: $(date)

VPS_API_KEY=${API_KEY}
ENCRYPTION_SECRET=ImperialTrade_BrokerEncryption_2025_v1

Frontend Configuration:
VITE_VPS_BROKER_URL=http://209.222.12.247
VITE_VPS_API_KEY=${API_KEY}
VITE_ENCRYPTION_SECRET=ImperialTrade_BrokerEncryption_2025_v1
EOF

        echo "✓ Credentials saved to /root/imperial-trade-credentials.txt"
    else
        echo "✓ .env already configured"
    fi
}

# Step 5: Install Dependencies and Build
build_service() {
    echo ""
    echo "[STEP 5/7] Building service..."

    cd /opt/imperial-trade/imperial-trade/vps-broker-service

    # Install dependencies
    npm install

    # Build TypeScript
    npm run build

    echo "✓ Service built successfully"
}

# Step 6: Deploy with PM2
deploy_pm2() {
    echo ""
    echo "[STEP 6/7] Deploying with PM2..."

    cd /opt/imperial-trade/imperial-trade/vps-broker-service

    # Stop existing process if running
    pm2 stop imperial-broker-service 2>/dev/null || true
    pm2 delete imperial-broker-service 2>/dev/null || true

    # Start service
    pm2 start dist/index.js --name "imperial-broker-service"
    pm2 save

    # Configure startup
    pm2 startup systemd -u root --hp /root

    echo "✓ Service deployed with PM2"
}

# Step 7: Configure nginx
configure_nginx() {
    echo ""
    echo "[STEP 7/7] Configuring nginx..."

    # Create nginx config
    cat > /etc/nginx/sites-available/imperial-trade <<'NGINXCONF'
server {
    listen 80;
    server_name 209.222.12.247;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINXCONF

    # Enable site
    ln -sf /etc/nginx/sites-available/imperial-trade /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default

    # Test and restart nginx
    nginx -t
    systemctl restart nginx
    systemctl enable nginx

    echo "✓ nginx configured"
}

# Step 8: Configure Firewall
configure_firewall() {
    echo ""
    echo "[STEP 8/7] Configuring firewall..."

    # Check if ufw is installed
    if command -v ufw &> /dev/null; then
        ufw allow 22/tcp  # SSH
        ufw allow 80/tcp  # HTTP
        ufw allow 443/tcp # HTTPS
        echo "y" | ufw enable
        echo "✓ Firewall configured"
    else
        echo "⚠ UFW not installed, skipping firewall configuration"
    fi
}

# Test deployment
test_deployment() {
    echo ""
    echo "================================"
    echo "Testing deployment..."
    echo "================================"

    sleep 3

    # Test locally
    echo "Testing locally..."
    LOCAL_TEST=$(curl -s http://localhost:3000/health || echo "FAILED")

    if [[ $LOCAL_TEST == *"healthy"* ]]; then
        echo "✓ Local test: PASSED"
    else
        echo "✗ Local test: FAILED"
        echo "Response: $LOCAL_TEST"
    fi

    # Test externally
    echo "Testing externally..."
    EXTERNAL_TEST=$(curl -s http://209.222.12.247/health || echo "FAILED")

    if [[ $EXTERNAL_TEST == *"healthy"* ]]; then
        echo "✓ External test: PASSED"
    else
        echo "✗ External test: FAILED"
        echo "Response: $EXTERNAL_TEST"
    fi
}

# Main execution
main() {
    check_root

    echo "This script will:"
    echo "  1. Install system dependencies"
    echo "  2. Clone the repository"
    echo "  3. Extract and build the service"
    echo "  4. Configure environment"
    echo "  5. Deploy with PM2"
    echo "  6. Configure nginx reverse proxy"
    echo "  7. Set up firewall"
    echo ""
    read -p "Continue? (y/n) " -n 1 -r
    echo

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled."
        exit 0
    fi

    setup_system
    clone_repo
    extract_service
    configure_env
    build_service
    deploy_pm2
    configure_nginx
    configure_firewall
    test_deployment

    echo ""
    echo "================================"
    echo "🎉 DEPLOYMENT COMPLETE!"
    echo "================================"
    echo ""
    echo "Service Status:"
    pm2 status
    echo ""
    echo "Service is running at:"
    echo "  → http://209.222.12.247/health"
    echo ""
    echo "Credentials saved to:"
    echo "  → /root/imperial-trade-credentials.txt"
    echo ""
    echo "Useful commands:"
    echo "  pm2 logs imperial-broker-service  - View logs"
    echo "  pm2 restart imperial-broker-service - Restart"
    echo "  pm2 status                         - Check status"
    echo "  cat /root/imperial-trade-credentials.txt - View credentials"
    echo ""
}

# Run main function
main
