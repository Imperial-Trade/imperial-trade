# Dockerfile for imperial-mt5-worker
# Ensures Wine 11.0 (latest stable) is installed

FROM ubuntu:22.04

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive
ENV DISPLAY=:99

# Install dependencies
RUN apt-get update && apt-get install -y \
    # Basic utilities
    wget \
    gnupg \
    software-properties-common \
    # Xvfb for virtual display (required for headless MT5)
    xvfb \
    # Wine dependencies
    && rm -rf /var/lib/apt/lists/*

# Enable 32-bit architecture support (required for Wine)
RUN dpkg --add-architecture i386

# Add WineHQ repository key
RUN mkdir -pm755 /etc/apt/keyrings && \
    wget -O - https://dl.winehq.org/wine-builds/winehq.key | gpg --dearmor -o /etc/apt/keyrings/winehq-archive.key

# Add WineHQ repository for Ubuntu 22.04 (jammy)
RUN wget -NP /etc/apt/sources.list.d/ https://dl.winehq.org/wine-builds/ubuntu/dists/jammy/winehq-jammy.sources

# Update package lists
RUN apt-get update

# Install Wine 11.0 (latest stable)
# winehq-stable will install the latest stable version (11.0 as of Jan 2026)
RUN apt-get install -y --install-recommends winehq-stable && \
    rm -rf /var/lib/apt/lists/*

# Verify Wine version
RUN wine --version || echo "Wine installation verification"

# Create MT5 directories
RUN mkdir -p /mt5/config /mt5/MQL5/Experts

# Copy entrypoint script
COPY entrypoint.sh /mt5/entrypoint.sh
RUN chmod +x /mt5/entrypoint.sh

# Set working directory
WORKDIR /mt5

# Default command (will be overridden by docker run)
CMD ["/mt5/entrypoint.sh"]
