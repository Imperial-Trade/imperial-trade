#!/bin/bash

# Install and configure nginx reverse proxy

set -e

echo "================================"
echo "Configuring nginx reverse proxy"
echo "================================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root (use: sudo bash install-nginx.sh)"
    exit 1
fi

# Copy nginx configuration
echo "[1/4] Installing nginx configuration..."
cp nginx-config.conf /etc/nginx/sites-available/imperial-trade

# Create symlink
echo "[2/4] Enabling site..."
ln -sf /etc/nginx/sites-available/imperial-trade /etc/nginx/sites-enabled/

# Remove default site
rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
echo "[3/4] Testing nginx configuration..."
nginx -t

# Restart nginx
echo "[4/4] Restarting nginx..."
systemctl restart nginx
systemctl enable nginx

echo ""
echo "================================"
echo "nginx configured successfully!"
echo "================================"
echo ""
echo "Your service is now accessible at:"
echo "  http://209.222.12.247"
echo ""
echo "To add SSL/HTTPS, install certbot:"
echo "  apt-get install -y certbot python3-certbot-nginx"
echo "  certbot --nginx -d yourdomain.com"
echo ""
