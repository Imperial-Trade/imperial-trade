#!/bin/bash

# Imperial Trade - Service Deployment Script
# Deploy and start the MT5 Broker Service

set -e

echo "================================"
echo "Deploying Imperial Trade Broker Service"
echo "================================"
echo ""

# Check if running in correct directory
if [ ! -f "package.json" ]; then
    echo "Error: package.json not found!"
    echo "Please run this script from the vps-broker-service directory"
    exit 1
fi

# Install dependencies
echo "[1/6] Installing Node.js dependencies..."
npm install

# Build TypeScript
echo "[2/6] Building TypeScript..."
npm run build

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "[3/6] Creating .env file from example..."
    cp .env.example .env
    echo ""
    echo "WARNING: Please edit .env file with your actual credentials!"
    echo "Required variables:"
    echo "  - VPS_API_KEY"
    echo "  - ENCRYPTION_SECRET"
    echo ""
    read -p "Press Enter after you've updated the .env file..."
fi

# Stop existing PM2 process if running
echo "[4/6] Stopping existing service (if any)..."
pm2 stop imperial-broker-service 2>/dev/null || true
pm2 delete imperial-broker-service 2>/dev/null || true

# Start service with PM2
echo "[5/6] Starting service with PM2..."
pm2 start dist/index.js --name "imperial-broker-service"
pm2 save

# Set PM2 to start on boot
echo "[6/6] Configuring PM2 startup..."
pm2 startup systemd -u root --hp /root

echo ""
echo "================================"
echo "Deployment complete!"
echo "================================"
echo ""
echo "Service status:"
pm2 status

echo ""
echo "Useful commands:"
echo "  pm2 logs imperial-broker-service  - View logs"
echo "  pm2 restart imperial-broker-service - Restart service"
echo "  pm2 stop imperial-broker-service   - Stop service"
echo "  pm2 status                         - Check status"
echo ""
echo "Test the service:"
echo "  curl http://localhost:3000/health"
echo ""
