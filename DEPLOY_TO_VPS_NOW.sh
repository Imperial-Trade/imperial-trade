#!/bin/bash
# DEPLOY TO VPS - Run this script to deploy everything to VPS
# Usage: bash DEPLOY_TO_VPS_NOW.sh

VPS_IP="45.32.89.134"
VPS_USER="Administrator"
VPS_PASS='2#bWj}tv=}5d}u5}'

echo "=============================================="
echo "DEPLOYING TO VPS"
echo "=============================================="
echo ""

# Step 1: Copy Python scripts
echo "Step 1: Copying Python scripts..."
sshpass -p "$VPS_PASS" scp -o StrictHostKeyChecking=no \
    vps-broker-service/python/test_connection.py \
    vps-broker-service/python/fetch_trades.py \
    vps-broker-service/python/get_servers.py \
    $VPS_USER@$VPS_IP:"C:/vps-broker-service/python/"

if [ $? -eq 0 ]; then
    echo "✅ Python scripts copied"
else
    echo "❌ Failed to copy Python scripts"
fi
echo ""

# Step 2: Build locally
echo "Step 2: Building TypeScript locally..."
cd vps-broker-service
npm run build
cd ..
echo ""

# Step 3: Copy compiled files
echo "Step 3: Copying compiled files..."
sshpass -p "$VPS_PASS" scp -o StrictHostKeyChecking=no \
    vps-broker-service/dist/terminal-manager.js \
    vps-broker-service/dist/index.js \
    $VPS_USER@$VPS_IP:"C:/vps-broker-service/dist/"

if [ $? -eq 0 ]; then
    echo "✅ Compiled files copied"
else
    echo "❌ Failed to copy compiled files"
fi
echo ""

# Step 4: Copy PowerShell scripts
echo "Step 4: Copying PowerShell scripts..."
sshpass -p "$VPS_PASS" scp -o StrictHostKeyChecking=no \
    vps-setup/*.ps1 \
    $VPS_USER@$VPS_IP:"C:/vps-broker-service/vps-setup/"

if [ $? -eq 0 ]; then
    echo "✅ PowerShell scripts copied"
else
    echo "❌ Failed to copy PowerShell scripts"
fi
echo ""

# Step 5: Restart broker service
echo "Step 5: Restarting broker service..."
sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP "pm2 restart imperial-trade-broker-service"
echo ""

# Step 6: Verify
echo "Step 6: Verifying..."
sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP "pm2 status"
echo ""

echo "=============================================="
echo "DEPLOYMENT COMPLETE"
echo "=============================================="
echo ""
echo "Next steps on VPS:"
echo "  1. Run: powershell.exe -ExecutionPolicy Bypass -File C:\\vps-broker-service\\vps-setup\\EXECUTE_THIS_NOW.ps1"
echo "  2. Or run these commands manually:"
echo "     cd C:\\vps-broker-service"
echo "     pm2 status"
echo "     Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue"
