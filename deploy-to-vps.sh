#!/bin/bash
# Deploy network fixes to Windows VPS

VPS_IP="45.32.89.134"
VPS_USER="Administrator"
VPS_PASS="2#bWj}tv=}5d}u5}"

echo "🔧 Deploying network fixes to VPS..."
echo ""

# Function to execute command on VPS via SSH
execute_vps() {
    ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 "$VPS_USER@$VPS_IP" "$1"
}

# Step 1: Copy fixed files
echo "📤 Step 1: Copying fixed files to VPS..."
scp -o StrictHostKeyChecking=no vps-broker-service/src/index.ts "$VPS_USER@$VPS_IP:C:/vps-broker-service/src/index.ts"
scp -o StrictHostKeyChecking=no vps-broker-service/apply-network-fixes.ps1 "$VPS_USER@$VPS_IP:C:/vps-broker-service/apply-network-fixes.ps1"

echo "✅ Files copied"
echo ""

# Step 2: Execute the PowerShell fix script
echo "🔧 Step 2: Running fix script on VPS..."
ssh -o StrictHostKeyChecking=no "$VPS_USER@$VPS_IP" "powershell -ExecutionPolicy Bypass -File C:\vps-broker-service\apply-network-fixes.ps1"

echo ""
echo "✅ Deployment complete!"







