#!/bin/bash
# SSH Key Setup Script
# Run this on your LOCAL machine (Mac/Linux)
# 
# This script sets up SSH key access to the VPS

set -e

VPS_IP="209.222.12.247"
VPS_USER="root"
SSH_KEY_NAME="vultr_vps_key"
SSH_KEY_PATH="$HOME/.ssh/$SSH_KEY_NAME"

# SSH key from user
SSH_KEY="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIPXrebYx8dH+0BXG3ByNJ5o3CqQ5Lj1M9BsQihbQ79TO vultr-vps"

echo "=========================================="
echo "🔑 SSH Key Setup for Vultr VPS"
echo "=========================================="
echo ""

# Create .ssh directory if it doesn't exist
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Check if key already exists
if [ -f "$SSH_KEY_PATH" ]; then
    echo "⚠️  SSH key already exists at $SSH_KEY_PATH"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted. Using existing key."
    else
        rm "$SSH_KEY_PATH"
    fi
fi

# Create SSH key file if it doesn't exist
if [ ! -f "$SSH_KEY_PATH" ]; then
    echo "📝 Creating SSH key file..."
    echo "$SSH_KEY" > "$SSH_KEY_PATH"
    chmod 600 "$SSH_KEY_PATH"
    echo "✅ SSH key file created at $SSH_KEY_PATH"
else
    echo "✅ Using existing SSH key file"
fi

# Update SSH config
SSH_CONFIG="$HOME/.ssh/config"
if [ ! -f "$SSH_CONFIG" ]; then
    touch "$SSH_CONFIG"
    chmod 600 "$SSH_CONFIG"
fi

# Check if config entry already exists
if grep -q "Host vultr-vps" "$SSH_CONFIG"; then
    echo "⚠️  SSH config entry for vultr-vps already exists"
else
    echo "" >> "$SSH_CONFIG"
    echo "# Vultr VPS - Imperial Journal XX Pro" >> "$SSH_CONFIG"
    echo "Host vultr-vps" >> "$SSH_CONFIG"
    echo "    HostName $VPS_IP" >> "$SSH_CONFIG"
    echo "    User $VPS_USER" >> "$SSH_CONFIG"
    echo "    IdentityFile $SSH_KEY_PATH" >> "$SSH_CONFIG"
    echo "    StrictHostKeyChecking no" >> "$SSH_CONFIG"
    echo "✅ SSH config updated"
fi

echo ""
echo "=========================================="
echo "✅ SSH Key Setup Complete!"
echo "=========================================="
echo ""
echo "You can now connect using:"
echo "  ssh vultr-vps"
echo ""
echo "Or directly:"
echo "  ssh -i $SSH_KEY_PATH root@$VPS_IP"
echo ""
