#!/bin/bash
# VPS Foundation Setup Script for Enterprise Stage 3
# Run this script on the VPS (Ubuntu 22.04)
# 
# This script installs:
# - Docker
# - Go (Golang)
# - Wine + Xvfb (for headless MT5)
# - Creates directory structure

set -e  # Exit on error

echo "=========================================="
echo "🚀 Imperial Journal XX Pro - VPS Setup"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Update system
echo -e "${BLUE}📦 Step 1: Updating system packages...${NC}"
apt update && apt upgrade -y
echo -e "${GREEN}✅ System updated${NC}"
echo ""

# Step 2: Install Docker
echo -e "${BLUE}🐳 Step 2: Installing Docker...${NC}"
apt install docker.io -y
systemctl enable --now docker
systemctl start docker
echo -e "${GREEN}✅ Docker installed and started${NC}"
docker --version
echo ""

# Step 3: Install Go
echo -e "${BLUE}🔷 Step 3: Installing Go (Golang)...${NC}"
apt install golang-go -y
echo -e "${GREEN}✅ Go installed${NC}"
go version
echo ""

# Step 4: Install Wine and Xvfb (for headless MT5)
echo -e "${BLUE}🍷 Step 4: Installing Wine and Xvfb...${NC}"
dpkg --add-architecture i386
apt update
apt install wine64 wine32:i386 xvfb unzip wget -y
echo -e "${GREEN}✅ Wine and Xvfb installed${NC}"
wine --version
echo ""

# Step 5: Create directory structure
echo -e "${BLUE}📁 Step 5: Creating directory structure...${NC}"
mkdir -p /root/imperial-factory/mt5-master
mkdir -p /root/imperial-factory/brain
mkdir -p /root/imperial-factory/config
mkdir -p /root/imperial-factory/logs
echo -e "${GREEN}✅ Directories created${NC}"
echo ""

# Step 6: Verify installations
echo -e "${BLUE}✅ Step 6: Verifying installations...${NC}"
echo ""
echo "Docker version:"
docker --version || echo "❌ Docker not found"
echo ""
echo "Go version:"
go version || echo "❌ Go not found"
echo ""
echo "Wine version:"
wine --version || echo "❌ Wine not found"
echo ""
echo "Xvfb:"
which Xvfb && echo "✅ Xvfb installed" || echo "❌ Xvfb not found"
echo ""

# Step 7: Test Docker
echo -e "${BLUE}🧪 Step 7: Testing Docker...${NC}"
docker ps > /dev/null 2>&1 && echo -e "${GREEN}✅ Docker is running${NC}" || echo -e "${YELLOW}⚠️  Docker may not be running properly${NC}"
echo ""

# Summary
echo "=========================================="
echo -e "${GREEN}🎉 VPS Foundation Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "Directory structure:"
ls -la /root/imperial-factory/
echo ""
echo "Next steps:"
echo "1. Copy Dockerfile to /root/imperial-factory/mt5-master/"
echo "2. Download MT5 installation files"
echo "3. Build Docker image: docker build -t imperial-worker ."
echo "4. Set up Go Brain in /root/imperial-factory/brain/"
echo ""
