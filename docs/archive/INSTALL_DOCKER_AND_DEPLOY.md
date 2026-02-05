# Install Docker and Deploy Edge Function

## Quick Installation Guide

Docker Desktop for macOS needs to be installed via download (can't be fully automated via CLI).

## Option 1: Install Docker Desktop (Recommended)

### Step 1: Download Docker Desktop

Visit: https://www.docker.com/products/docker-desktop/

Or install via Homebrew:
```bash
brew install --cask docker
```

### Step 2: Start Docker Desktop

After installation:
1. Open **Docker Desktop** from Applications
2. Wait for it to start (whale icon in menu bar)
3. Make sure it says "Docker Desktop is running"

### Step 3: Verify Docker is Running

In terminal:
```bash
docker ps
```

Should return an empty table (not an error).

### Step 4: Deploy with Docker

```bash
cd "/Users/nthny_11/Trade imperial GITHUB /nov 7 notif project/imperial-trade"
supabase functions deploy test-broker-connection --use-docker
```

## Option 2: Install via Homebrew (Faster)

If you prefer command-line installation:

```bash
# Install Docker Desktop
brew install --cask docker

# Start Docker Desktop (may require manual launch from Applications)
open -a Docker

# Wait 10-20 seconds for Docker to start, then verify:
docker ps

# Deploy:
cd "/Users/nthny_11/Trade imperial GITHUB /nov 7 notif project/imperial-trade"
supabase functions deploy test-broker-connection --use-docker
```

## What --use-docker Does:

- Bundles the function locally using Docker
- Creates the deployment package on your machine
- Uploads only the final bundle (faster, avoids timeout)

## Troubleshooting:

### If Docker doesn't start:
- Make sure Docker Desktop app is open
- Check menu bar for Docker icon
- Wait 30-60 seconds after opening

### If `docker ps` fails:
- Docker Desktop might not be running
- Restart Docker Desktop
- Check System Preferences > Security for permissions

## Quick Command Summary:

```bash
# 1. Install (if needed)
brew install --cask docker

# 2. Start Docker Desktop (open from Applications or):
open -a Docker

# 3. Wait for Docker to start (10-20 seconds)

# 4. Verify:
docker ps

# 5. Deploy:
cd "/Users/nthny_11/Trade imperial GITHUB /nov 7 notif project/imperial-trade"
supabase functions deploy test-broker-connection --use-docker
```







