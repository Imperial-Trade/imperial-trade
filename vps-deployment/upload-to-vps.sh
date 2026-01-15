#!/bin/bash

# Upload files to VPS
# Run this script from your local machine

VPS_IP="209.222.12.247"
VPS_USER="root"
VPS_PATH="/opt/imperial-trade"

echo "================================"
echo "Uploading files to VPS"
echo "================================"
echo ""

# Check if vps-broker-service exists
if [ ! -d "../vps-broker-service" ]; then
    echo "Error: vps-broker-service directory not found!"
    echo "Please run this script from the vps-deployment directory"
    exit 1
fi

# Upload vps-broker-service
echo "[1/2] Uploading vps-broker-service..."
rsync -avz --progress ../vps-broker-service/ ${VPS_USER}@${VPS_IP}:${VPS_PATH}/vps-broker-service/

# Upload deployment scripts
echo "[2/2] Uploading deployment scripts..."
rsync -avz --progress ./*.sh ./*.conf ${VPS_USER}@${VPS_IP}:${VPS_PATH}/vps-broker-service/

echo ""
echo "================================"
echo "Upload complete!"
echo "================================"
echo ""
echo "Next steps:"
echo "1. SSH into the VPS:"
echo "   ssh ${VPS_USER}@${VPS_IP}"
echo ""
echo "2. Run the setup:"
echo "   cd ${VPS_PATH}/vps-broker-service"
echo "   bash setup-vps.sh"
echo "   bash deploy-service.sh"
echo ""
