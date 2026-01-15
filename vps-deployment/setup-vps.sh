#!/bin/bash

# Imperial Trade - VPS Setup Script
# Run this script on your Vultr VPS to set up the MT5 Broker Service

set -e

echo "================================"
echo "Imperial Trade VPS Setup"
echo "================================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root (use: sudo bash setup-vps.sh)"
    exit 1
fi

# Update system
echo "[1/8] Updating system packages..."
apt-get update -y
apt-get upgrade -y

# Install Node.js 20.x
echo "[2/8] Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install Python and pip
echo "[3/8] Installing Python 3 and pip..."
apt-get install -y python3 python3-pip

# Install MetaTrader5 Python library
echo "[4/8] Installing MetaTrader5 Python library..."
pip3 install MetaTrader5

# Install PM2 for process management
echo "[5/8] Installing PM2..."
npm install -g pm2

# Install Git if not present
echo "[6/8] Installing Git..."
apt-get install -y git

# Create application directory
echo "[7/8] Setting up application directory..."
mkdir -p /opt/imperial-trade
cd /opt/imperial-trade

# Install nginx for reverse proxy
echo "[8/8] Installing nginx..."
apt-get install -y nginx

echo ""
echo "================================"
echo "System setup complete!"
echo "================================"
echo ""
echo "Next steps:"
echo "1. Upload your vps-broker-service files to /opt/imperial-trade"
echo "2. Run the deploy-service.sh script"
echo ""
