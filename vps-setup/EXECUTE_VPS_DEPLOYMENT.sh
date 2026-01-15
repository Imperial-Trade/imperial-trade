#!/bin/bash
# ============================================================================
# EXECUTE VPS DEPLOYMENT - Mac/Linux Script
# ============================================================================
# This script helps deploy the broker service fixes to your VPS
# Run this from your LOCAL machine (Mac/Linux)

set -e  # Exit on error

VPS_IP="45.32.89.134"
VPS_USER="Administrator"
PROJECT_DIR="/Users/nthny_11/Trade imperial GITHUB /nov 7 notif project/imperial-trade"

echo ""
echo "==============================================================================="
echo "  VPS DEPLOYMENT SCRIPT"
echo "==============================================================================="
echo ""
echo "  VPS IP: $VPS_IP"
echo "  VPS User: $VPS_USER"
echo "  Project Directory: $PROJECT_DIR"
echo ""

# Check if project directory exists
if [ ! -d "$PROJECT_DIR" ]; then
    echo "❌ Project directory not found: $PROJECT_DIR"
    exit 1
fi

cd "$PROJECT_DIR"

echo "✅ Project directory found"
echo ""

# ============================================================================
# Step 1: Copy Python Scripts
# ============================================================================
echo "1. COPYING PYTHON SCRIPTS..."
echo "─────────────────────────────────────────────────────────────────"

PYTHON_SCRIPTS=(
    "vps-broker-service/python/test_connection.py"
    "vps-broker-service/python/fetch_trades.py"
)

for script in "${PYTHON_SCRIPTS[@]}"; do
    if [ -f "$script" ]; then
        echo "  Copying $script..."
        scp -o StrictHostKeyChecking=no "$script" "${VPS_USER}@${VPS_IP}:C:/vps-broker-service/python/"
        if [ $? -eq 0 ]; then
            echo "    ✅ $script copied successfully"
        else
            echo "    ❌ Failed to copy $script"
            exit 1
        fi
    else
        echo "    ⚠️  File not found: $script (skipping)"
    fi
done

echo ""

# ============================================================================
# Step 2: Copy TypeScript Source (if needed)
# ============================================================================
echo "2. COPYING TYPESCRIPT SOURCE..."
echo "─────────────────────────────────────────────────────────────────"

if [ -f "vps-broker-service/src/index.ts" ]; then
    echo "  Copying index.ts..."
    scp -o StrictHostKeyChecking=no "vps-broker-service/src/index.ts" "${VPS_USER}@${VPS_IP}:C:/vps-broker-service/src/"
    if [ $? -eq 0 ]; then
        echo "    ✅ index.ts copied successfully"
    else
        echo "    ❌ Failed to copy index.ts"
        exit 1
    fi
else
    echo "    ⚠️  index.ts not found (skipping)"
fi

echo ""

# ============================================================================
# Step 3: Copy Deployment Script
# ============================================================================
echo "3. COPYING DEPLOYMENT SCRIPT..."
echo "─────────────────────────────────────────────────────────────────"

if [ -f "vps-setup/DEPLOY_VPS_BROKER_SERVICE.ps1" ]; then
    echo "  Copying DEPLOY_VPS_BROKER_SERVICE.ps1..."
    
    # Create vps-setup directory on VPS if it doesn't exist
    ssh -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_IP}" "if (-not (Test-Path C:\vps-setup)) { New-Item -ItemType Directory -Path C:\vps-setup | Out-Null }"
    
    scp -o StrictHostKeyChecking=no "vps-setup/DEPLOY_VPS_BROKER_SERVICE.ps1" "${VPS_USER}@${VPS_IP}:C:/vps-setup/"
    if [ $? -eq 0 ]; then
        echo "    ✅ Deployment script copied successfully"
    else
        echo "    ❌ Failed to copy deployment script"
        exit 1
    fi
else
    echo "    ⚠️  Deployment script not found (skipping)"
fi

echo ""

# ============================================================================
# Step 4: Execute Deployment on VPS
# ============================================================================
echo "4. EXECUTING DEPLOYMENT ON VPS..."
echo "─────────────────────────────────────────────────────────────────"

echo "  Running deployment script on VPS..."
echo ""
echo "  NOTE: You may be prompted for VPS password"
echo ""

# Execute deployment script on VPS
ssh -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_IP}" "powershell.exe -ExecutionPolicy Bypass -File C:\vps-setup\DEPLOY_VPS_BROKER_SERVICE.ps1"

if [ $? -eq 0 ]; then
    echo ""
    echo "  ✅ Deployment executed successfully"
else
    echo ""
    echo "  ❌ Deployment failed"
    echo "  Please check the output above for errors"
    exit 1
fi

echo ""

# ============================================================================
# Step 5: Verify Deployment
# ============================================================================
echo "5. VERIFYING DEPLOYMENT..."
echo "─────────────────────────────────────────────────────────────────"

echo "  Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "http://${VPS_IP}:3001/health" || echo "000")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    echo "    ✅ Health check passed (HTTP $HTTP_CODE)"
    echo "    Response: $HEALTH_BODY" | head -c 100
    echo "..."
else
    echo "    ⚠️  Health check returned HTTP $HTTP_CODE"
    echo "    Service may still be starting up"
fi

echo ""
echo ""

# ============================================================================
# SUMMARY
# ============================================================================
echo "==============================================================================="
echo "  ✅ DEPLOYMENT COMPLETE"
echo "==============================================================================="
echo ""
echo "  Next Steps:"
echo "    1. Check VPS logs: ssh $VPS_USER@$VPS_IP 'pm2 logs imperial-trade-broker-service --lines 50'"
echo "    2. Run verification: ssh $VPS_USER@$VPS_IP 'C:\vps-setup\VERIFY_COMPLETE_CONNECTION_CHAIN.ps1'"
echo "    3. Test Edge Function connection from frontend"
echo ""
echo "==============================================================================="
echo ""
