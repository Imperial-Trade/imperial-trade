#!/bin/bash
# VPS Setup Script with Password Authentication
# This script uses sshpass to automate VPS setup with password
# 
# Usage: ./vps-setup-with-password.sh

set -e

VPS_IP="209.222.12.247"
VPS_USER="root"
VPS_PASSWORD="eJ)3-BJ9p9RsF2S$"
SCRIPT_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/vps-setup-foundation.sh"

# Check if sshpass is installed
if ! command -v sshpass &> /dev/null; then
    echo "⚠️  sshpass is not installed."
    echo "Installing sshpass..."
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            brew install hudochenkov/sshpass/sshpass
        else
            echo "❌ Please install Homebrew first: https://brew.sh"
            echo "Then run: brew install hudochenkov/sshpass/sshpass"
            exit 1
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        if command -v apt-get &> /dev/null; then
            sudo apt-get install -y sshpass
        elif command -v yum &> /dev/null; then
            sudo yum install -y sshpass
        else
            echo "❌ Please install sshpass manually"
            exit 1
        fi
    else
        echo "❌ Unsupported OS. Please install sshpass manually."
        exit 1
    fi
fi

echo "=========================================="
echo "🚀 VPS Setup - Automated (Password Auth)"
echo "=========================================="
echo ""

# Copy setup script to VPS
echo "📤 Copying setup script to VPS..."
sshpass -p "$VPS_PASSWORD" scp -o StrictHostKeyChecking=no "$SCRIPT_PATH" "$VPS_USER@$VPS_IP:/root/vps-setup-foundation.sh"

# Execute setup script on VPS
echo "🔧 Executing setup script on VPS..."
echo ""
sshpass -p "$VPS_PASSWORD" ssh -o StrictHostKeyChecking=no "$VPS_USER@$VPS_IP" "chmod +x /root/vps-setup-foundation.sh && bash /root/vps-setup-foundation.sh"

echo ""
echo "=========================================="
echo "✅ VPS Setup Complete!"
echo "=========================================="
