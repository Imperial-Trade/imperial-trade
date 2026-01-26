#!/bin/bash
# Upload Dockerfile to VPS
# This script copies the Dockerfile to the VPS

set -e

VPS_IP="209.222.12.247"
VPS_USER="root"
VPS_PASSWORD="eJ)3-BJ9p9RsF2S$"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=========================================="
echo "📤 Uploading Dockerfile to VPS"
echo "=========================================="
echo ""

# Check if sshpass is available
if ! command -v sshpass &> /dev/null; then
    echo "❌ sshpass is not installed. Please install it first."
    exit 1
fi

# Create Dockerfile content on VPS
echo "Creating Dockerfile on VPS..."
sshpass -p "$VPS_PASSWORD" ssh -o StrictHostKeyChecking=no "$VPS_USER@$VPS_IP" "cat > /root/imperial-factory/mt5-master/Dockerfile" << 'DOCKERFILE_EOF'
FROM ubuntu:22.04
ENV DEBIAN_FRONTEND=noninteractive
RUN dpkg --add-architecture i386 && apt-get update && \
    apt-get install -y wine64 wine32 xvfb && apt-get clean

WORKDIR /mt5
COPY . /mt5

# entrypoint.sh: Starts virtual display and runs MT5 with the specific user config
RUN echo '#!/bin/bash\n\
Xvfb :99 -screen 0 1024x768x16 &\n\
export DISPLAY=:99\n\
wine /mt5/terminal64.exe /portable /config:/mt5/config/launch.ini' > /mt5/entrypoint.sh

RUN chmod +x /mt5/entrypoint.sh
ENTRYPOINT ["/mt5/entrypoint.sh"]
DOCKERFILE_EOF

echo "✅ Dockerfile created on VPS at /root/imperial-factory/mt5-master/Dockerfile"
echo ""
echo "Next steps:"
echo "1. Download MT5 installation to VPS"
echo "2. Copy MT5 files to /root/imperial-factory/mt5-master/"
echo "3. Build Docker image: docker build -t imperial-worker ."
