#!/bin/bash
# ============================================================================
# DEPLOY TO VPS - Automated Deployment Script with Password
# ============================================================================

set -e  # Exit on error

VPS_IP="45.32.89.134"
VPS_USER="Administrator"
VPS_PASS="2#bWj}tv=}5d}u5}"
PROJECT_DIR="/Users/nthny_11/Trade imperial GITHUB /nov 7 notif project/imperial-trade"

echo ""
echo "==============================================================================="
echo "  DEPLOYING TO VPS - $VPS_IP"
echo "==============================================================================="
echo ""

cd "$PROJECT_DIR"

# Function to run SSH command with password
run_ssh() {
    sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "${VPS_USER}@${VPS_IP}" "$@"
}

# Function to copy file with password
copy_file() {
    local source="$1"
    local dest="$2"
    echo "  Copying $(basename $source)..."
    sshpass -p "$VPS_PASS" scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$source" "${VPS_USER}@${VPS_IP}:${dest}" 2>&1
    return $?
}

# ============================================================================
# Step 1: Copy Python Scripts
# ============================================================================
echo "1. COPYING PYTHON SCRIPTS..."
echo "─────────────────────────────────────────────────────────────────"

FILES_COPIED=0

# Copy test_connection.py
if [ -f "vps-broker-service/python/test_connection.py" ]; then
    if copy_file "vps-broker-service/python/test_connection.py" "C:/vps-broker-service/python/test_connection.py"; then
        echo "    ✅ test_connection.py copied successfully"
        FILES_COPIED=$((FILES_COPIED + 1))
    else
        echo "    ❌ Failed to copy test_connection.py"
    fi
else
    echo "    ⚠️  test_connection.py not found locally (skipping)"
fi

# Copy fetch_trades.py
if [ -f "vps-broker-service/python/fetch_trades.py" ]; then
    if copy_file "vps-broker-service/python/fetch_trades.py" "C:/vps-broker-service/python/fetch_trades.py"; then
        echo "    ✅ fetch_trades.py copied successfully"
        FILES_COPIED=$((FILES_COPIED + 1))
    else
        echo "    ❌ Failed to copy fetch_trades.py"
    fi
else
    echo "    ⚠️  fetch_trades.py not found locally (skipping)"
fi

echo ""

# ============================================================================
# Step 2: Copy TypeScript Source
# ============================================================================
echo "2. COPYING TYPESCRIPT SOURCE..."
echo "─────────────────────────────────────────────────────────────────"

if [ -f "vps-broker-service/src/index.ts" ]; then
    if copy_file "vps-broker-service/src/index.ts" "C:/vps-broker-service/src/index.ts"; then
        echo "    ✅ index.ts copied successfully"
        FILES_COPIED=$((FILES_COPIED + 1))
    else
        echo "    ❌ Failed to copy index.ts"
    fi
else
    echo "    ⚠️  index.ts not found locally (skipping)"
fi

echo ""

# ============================================================================
# Step 3: Copy Deployment Script
# ============================================================================
echo "3. COPYING DEPLOYMENT SCRIPT..."
echo "─────────────────────────────────────────────────────────────────"

# Create vps-setup directory on VPS if it doesn't exist
run_ssh "powershell.exe -Command \"if (-not (Test-Path C:\\vps-setup)) { New-Item -ItemType Directory -Path C:\\vps-setup | Out-Null }\""

if [ -f "vps-setup/DEPLOY_VPS_BROKER_SERVICE.ps1" ]; then
    if copy_file "vps-setup/DEPLOY_VPS_BROKER_SERVICE.ps1" "C:/vps-setup/DEPLOY_VPS_BROKER_SERVICE.ps1"; then
        echo "    ✅ DEPLOY_VPS_BROKER_SERVICE.ps1 copied successfully"
        FILES_COPIED=$((FILES_COPIED + 1))
    else
        echo "    ❌ Failed to copy deployment script"
    fi
fi

echo ""

# ============================================================================
# Step 4: Execute Deployment on VPS
# ============================================================================
echo "4. EXECUTING DEPLOYMENT ON VPS..."
echo "─────────────────────────────────────────────────────────────────"

echo "  Building TypeScript and restarting service..."
run_ssh "powershell.exe -ExecutionPolicy Bypass -Command \"
cd C:\\vps-broker-service
Write-Host 'Building TypeScript...' -ForegroundColor Yellow
npm run build
if (\$LASTEXITCODE -eq 0) {
    Write-Host 'Build successful' -ForegroundColor Green
    Write-Host 'Restarting PM2 service...' -ForegroundColor Yellow
    pm2 restart imperial-trade-broker-service
    Start-Sleep -Seconds 3
    pm2 status | Select-String 'imperial-trade-broker-service'
    Write-Host 'Service restarted' -ForegroundColor Green
} else {
    Write-Host 'Build failed' -ForegroundColor Red
    exit 1
}
\""

DEPLOY_EXIT_CODE=$?

if [ $DEPLOY_EXIT_CODE -eq 0 ]; then
    echo ""
    echo "    ✅ Deployment executed successfully"
else
    echo ""
    echo "    ⚠️  Deployment completed with exit code: $DEPLOY_EXIT_CODE"
fi

echo ""

# ============================================================================
# Step 5: Verify Deployment
# ============================================================================
echo "5. VERIFYING DEPLOYMENT..."
echo "─────────────────────────────────────────────────────────────────"

echo "  Checking service status..."
SERVICE_STATUS=$(run_ssh "powershell.exe -Command \"pm2 jlist | ConvertFrom-Json | Where-Object { \$_.name -eq 'imperial-trade-broker-service' } | Select-Object -ExpandProperty pm2_env.status\"" 2>&1 | tail -1)

if [ -n "$SERVICE_STATUS" ]; then
    echo "    Service Status: $SERVICE_STATUS"
    if [[ "$SERVICE_STATUS" == *"online"* ]]; then
        echo "    ✅ Service is ONLINE"
    else
        echo "    ⚠️  Service status: $SERVICE_STATUS"
    fi
else
    echo "    ⚠️  Could not retrieve service status"
fi

echo ""
echo "  Testing health endpoint..."
HEALTH_RESPONSE=$(run_ssh "powershell.exe -Command \"try { \$response = Invoke-WebRequest -Uri 'http://localhost:3001/health' -UseBasicParsing -TimeoutSec 5; Write-Host \$response.StatusCode; Write-Host \$response.Content } catch { Write-Host 'ERROR:'; Write-Host \$_.Exception.Message }\"" 2>&1)

if echo "$HEALTH_RESPONSE" | grep -q "200"; then
    echo "    ✅ Health check passed (HTTP 200)"
    echo "$HEALTH_RESPONSE" | grep -A 5 "200" | head -3
else
    echo "    ⚠️  Health check response:"
    echo "$HEALTH_RESPONSE" | head -5
fi

echo ""

# ============================================================================
# Step 6: Verify External Access
# ============================================================================
echo "6. VERIFYING EXTERNAL ACCESS..."
echo "─────────────────────────────────────────────────────────────────"

EXTERNAL_HEALTH=$(curl -s -w "\n%{http_code}" "http://${VPS_IP}:3001/health" --max-time 5 || echo "000")
HTTP_CODE=$(echo "$EXTERNAL_HEALTH" | tail -n1)
HEALTH_BODY=$(echo "$EXTERNAL_HEALTH" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    echo "    ✅ External health check passed (HTTP $HTTP_CODE)"
    echo "    Response: $(echo "$HEALTH_BODY" | head -c 100)..."
else
    echo "    ⚠️  External health check returned HTTP $HTTP_CODE"
    echo "    This may be normal if firewall is blocking external access"
fi

echo ""

# ============================================================================
# SUMMARY
# ============================================================================
echo "==============================================================================="
echo "  DEPLOYMENT COMPLETE"
echo "==============================================================================="
echo ""
echo "  Files Copied: $FILES_COPIED"
echo "  Service Status: $SERVICE_STATUS"
echo "  Health Check: $(if echo "$HEALTH_RESPONSE" | grep -q "200"; then echo "✅ OK"; else echo "⚠️  Check logs"; fi)"
echo ""
echo "  Next Steps:"
echo "    1. Check logs: ssh $VPS_USER@$VPS_IP 'pm2 logs imperial-trade-broker-service --lines 50'"
echo "    2. Test Edge Function connection from frontend"
echo "    3. Verify complete chain: C:\\vps-setup\\VERIFY_COMPLETE_CONNECTION_CHAIN.ps1"
echo ""
echo "==============================================================================="
echo ""
