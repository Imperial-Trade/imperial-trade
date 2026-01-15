#!/bin/bash
# Deployment script for Imperial Brain on Ubuntu VPS
# Run this script on the VPS after uploading the code

set -e

echo "🚀 Imperial Brain - VPS Deployment Script"
echo "=========================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
VPS_USER="root"
VPS_IP="209.222.12.247"
INSTALL_DIR="/root/imperial-factory/broker-service/go-brain"
CONFIG_DIR="/root/imperial-factory/config"
SERVICE_NAME="imperial-brain"

echo ""
echo -e "${YELLOW}Step 1: Creating directories...${NC}"
mkdir -p "$INSTALL_DIR"
mkdir -p "$CONFIG_DIR"
echo -e "${GREEN}✅ Directories created${NC}"

echo ""
echo -e "${YELLOW}Step 2: Checking Go installation...${NC}"
if ! command -v go &> /dev/null; then
    echo -e "${RED}❌ Go is not installed${NC}"
    echo "Installing Go..."
    apt-get update
    apt-get install -y golang-go
else
    echo -e "${GREEN}✅ Go is installed: $(go version)${NC}"
fi

echo ""
echo -e "${YELLOW}Step 3: Installing dependencies...${NC}"
cd "$INSTALL_DIR"
if [ -f "go.mod" ]; then
    go mod download
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo -e "${RED}❌ go.mod not found. Please upload main.go and go.mod first${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 4: Building Imperial Brain...${NC}"
go build -o imperial-brain main.go
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build successful${NC}"
    chmod +x imperial-brain
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 5: Installing systemd service...${NC}"
if [ -f "imperial-brain.service" ]; then
    cp imperial-brain.service /etc/systemd/system/
    systemctl daemon-reload
    echo -e "${GREEN}✅ Service installed${NC}"
else
    echo -e "${YELLOW}⚠️  Service file not found. Creating default service...${NC}"
    cat > /etc/systemd/system/imperial-brain.service << 'EOF'
[Unit]
Description=Imperial Brain - MT5 Container Orchestrator
After=docker.service
Requires=docker.service

[Service]
Type=simple
User=root
WorkingDirectory=/root/imperial-factory/broker-service/go-brain
ExecStart=/root/imperial-factory/broker-service/go-brain/imperial-brain
Restart=always
RestartSec=10
Environment="DATABASE_URL=postgres://postgres.kmuoqkcxguafxulqlbmi:Tradeimperial%40315@aws-0-us-west-1.pooler.supabase.com:6543/postgres?sslmode=require"
Environment="LISTENER_DATABASE_URL=postgres://postgres.kmuoqkcxguafxulqlbmi:Tradeimperial%40315@db.kmuoqkcxguafxulqlbmi.supabase.co:5432/postgres?sslmode=require"
Environment="ENCRYPTION_SECRET=ImperialTrade_BrokerEncryption_2025_v1"

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=imperial-brain

[Install]
WantedBy=multi-user.target
EOF
    systemctl daemon-reload
    echo -e "${GREEN}✅ Service created and installed${NC}"
fi

echo ""
echo -e "${YELLOW}Step 6: Verifying Docker is running...${NC}"
if systemctl is-active --quiet docker; then
    echo -e "${GREEN}✅ Docker is running${NC}"
else
    echo -e "${RED}❌ Docker is not running. Starting Docker...${NC}"
    systemctl start docker
    systemctl enable docker
fi

echo ""
echo -e "${YELLOW}Step 7: Checking Docker image...${NC}"
if docker images | grep -q "imperial-mt5-worker"; then
    echo -e "${GREEN}✅ Docker image 'imperial-mt5-worker' found${NC}"
else
    echo -e "${YELLOW}⚠️  Docker image 'imperial-mt5-worker' not found${NC}"
    echo "Please build the image using: docker build -t imperial-mt5-worker:latest /path/to/dockerfile"
fi

echo ""
echo -e "${YELLOW}Step 8: Enabling service...${NC}"
systemctl enable imperial-brain
echo -e "${GREEN}✅ Service enabled${NC}"

echo ""
echo -e "${GREEN}=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "To start the service:"
echo "  sudo systemctl start imperial-brain"
echo ""
echo "To check status:"
echo "  sudo systemctl status imperial-brain"
echo ""
echo "To view logs:"
echo "  sudo journalctl -u imperial-brain -f"
echo ""
echo "To restart:"
echo "  sudo systemctl restart imperial-brain"
echo ""
