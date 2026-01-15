# Quick Docker Setup & Deploy

## Install Docker Desktop (Choose One):

### Method 1: Via Homebrew (Command Line)
Run this in your terminal:
```bash
brew install --cask docker
```

### Method 2: Manual Download
1. Visit: https://www.docker.com/products/docker-desktop/
2. Download Docker Desktop for Mac (Apple Silicon or Intel)
3. Open the .dmg file
4. Drag Docker to Applications
5. Open Docker from Applications

---

## After Installation:

### Step 1: Start Docker Desktop
- Open **Docker Desktop** from Applications
- Wait for it to fully start (whale icon appears in menu bar)
- Should say "Docker Desktop is running"

### Step 2: Verify Docker Works
```bash
docker ps
```
Should return a table (even if empty), not an error.

### Step 3: Deploy Function
```bash
cd "/Users/nthny_11/Trade imperial GITHUB /nov 7 notif project/imperial-trade"
supabase functions deploy test-broker-connection --use-docker
```

---

## If You Don't Want to Install Docker:

**Alternative**: Wait 1-2 hours and retry without Docker:
```bash
supabase functions deploy test-broker-connection
```

The bundling service issue might resolve itself.

---

## Why --use-docker Helps:

- Bundles locally (avoids Supabase bundling service timeout)
- Only uploads final package (faster)
- More reliable when service is having issues







