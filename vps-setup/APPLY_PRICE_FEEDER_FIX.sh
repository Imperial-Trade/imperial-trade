#!/bin/bash
# ============================================================================
# APPLY PRICE FEEDER FIX TO VPS
# ============================================================================

VPS_IP="45.32.89.134"
VPS_USER="Administrator"
VPS_PASSWORD="2#bWj}tv=}5d}u5}"

echo ""
echo "==============================================================================="
echo "  APPLYING PRICE FEEDER FIX TO VPS"
echo "==============================================================================="
echo ""

# Check if sshpass is available
if ! command -v sshpass &> /dev/null; then
    echo "❌ sshpass not installed. Installing..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install hudochenkov/sshpass/sshpass 2>/dev/null || echo "Please install sshpass: brew install hudochenkov/sshpass/sshpass"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt-get install -y sshpass 2>/dev/null || sudo yum install -y sshpass 2>/dev/null
    fi
fi

# Create directory on VPS if it doesn't exist
echo "Step 1: Creating Python directory on VPS (if needed)..."
sshpass -p "$VPS_PASSWORD" ssh -o StrictHostKeyChecking=no \
    "${VPS_USER}@${VPS_IP}" \
    "powershell.exe -Command \"if (-not (Test-Path 'C:\\imperial-price-feeder\\python')) { New-Item -ItemType Directory -Path 'C:\\imperial-price-feeder\\python' -Force | Out-Null; Write-Host 'Directory created' } else { Write-Host 'Directory exists' }\""

# Copy fixed Python script to VPS
echo ""
echo "Step 2: Copying fixed Python script to VPS..."
sshpass -p "$VPS_PASSWORD" scp -o StrictHostKeyChecking=no \
    "vps-setup/imperial-price-feeder/python/mt5_price_reader.py" \
    "${VPS_USER}@${VPS_IP}:/imperial-price-feeder/python/mt5_price_reader.py"

if [ $? -eq 0 ]; then
    echo "✅ Python script copied successfully"
else
    echo "❌ Failed to copy Python script - trying alternative method..."
    # Try with backslashes
    sshpass -p "$VPS_PASSWORD" ssh -o StrictHostKeyChecking=no \
        "${VPS_USER}@${VPS_IP}" \
        "powershell.exe -Command \"\$content = @'\"; cat vps-setup/imperial-price-feeder/python/mt5_price_reader.py | sshpass -p '$VPS_PASSWORD' ssh -o StrictHostKeyChecking=no ${VPS_USER}@${VPS_IP} 'powershell.exe -Command \"Set-Content -Path C:\\imperial-price-feeder\\python\\mt5_price_reader.py -Value (Get-Content -Raw)\"'"
fi

echo ""
echo "Step 2: Copying fix script to VPS..."
sshpass -p "$VPS_PASSWORD" scp -o StrictHostKeyChecking=no \
    "vps-setup/FIX_PRICE_FEEDER_NOW.ps1" \
    "${VPS_USER}@${VPS_IP}:C:/vps-setup/FIX_PRICE_FEEDER_NOW.ps1"

if [ $? -eq 0 ]; then
    echo "✅ Fix script copied successfully"
else
    echo "❌ Failed to copy fix script"
    exit 1
fi

echo ""
echo "Step 3: Running fix script on VPS..."
sshpass -p "$VPS_PASSWORD" ssh -o StrictHostKeyChecking=no \
    "${VPS_USER}@${VPS_IP}" \
    "powershell.exe -ExecutionPolicy Bypass -File C:/vps-setup/FIX_PRICE_FEEDER_NOW.ps1"

echo ""
echo "==============================================================================="
echo "  DEPLOYMENT COMPLETE"
echo "==============================================================================="
echo ""
