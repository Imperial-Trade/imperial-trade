#!/bin/bash
# VPS Deployment Script - Go Brain Update
# Run this script on the VPS after SSH'ing in

set -e

echo "🚀 Starting Go Brain Deployment..."

# Find go-brain directory
GO_BRAIN_DIR="/root/vps-broker-service/go-brain"

if [ ! -d "$GO_BRAIN_DIR" ]; then
    echo "❌ Go Brain directory not found at $GO_BRAIN_DIR"
    echo "Searching for go-brain directory..."
    GO_BRAIN_DIR=$(find /root -name "go-brain" -type d 2>/dev/null | head -1)
    if [ -z "$GO_BRAIN_DIR" ]; then
        echo "❌ Go Brain directory not found. Please check the path."
        exit 1
    fi
    echo "✅ Found Go Brain at: $GO_BRAIN_DIR"
fi

cd "$GO_BRAIN_DIR"

echo "📂 Current directory: $(pwd)"
echo "📋 Checking Go version..."
go version

echo "🔨 Building Go Brain..."
go build -o go-brain main.go

if [ ! -f "./go-brain" ]; then
    echo "❌ Build failed - binary not found"
    exit 1
fi

echo "✅ Build successful!"

# Check if systemd service exists
if systemctl list-unit-files | grep -q "go-brain.service"; then
    echo "🔄 Restarting systemd service..."
    sudo systemctl stop go-brain || true
    sudo systemctl start go-brain
    echo "✅ Service restarted"
    
    echo "📊 Service status:"
    sudo systemctl status go-brain --no-pager || true
else
    echo "⚠️  systemd service not found. Please start manually:"
    echo "   ./go-brain"
fi

echo "✅ Deployment complete!"
