# Architecture Clarification

## Current Situation

### What's Running on VPS:
- ✅ **Go Brain Service** (`imperial-brain.service`) - Running
  - Manages Docker containers
  - Polls database for `next_sync_task`
  - Handles MT5 connections via Docker

### What's NOT Running:
- ❌ **Node.js Broker Service** - NOT running
  - Should handle `/fetch-trades` endpoint
  - Should run on port 3001
  - Expected by Edge Function `sync-broker-trades`

---

## The Problem

**Edge Function `sync-broker-trades` calls:**
```
POST http://209.222.12.247:3001/fetch-trades
```

**But:**
- Port 3001 is NOT listening
- No Node.js service running
- Only Go Brain is running

---

## Architecture Options

### Option 1: Node.js Service Needed
- The Node.js broker service (`vps-broker-service`) needs to be deployed on Ubuntu VPS
- It should run on port 3001
- It handles `/fetch-trades` endpoint
- Go Brain is separate (manages containers)

### Option 2: Architecture Changed
- Go Brain now handles everything
- Edge Function should call Go Brain instead of Node.js service
- But Go Brain doesn't have HTTP server (only polls database)

### Option 3: Hybrid Approach
- Go Brain manages containers (currently running)
- Node.js service provides HTTP API (needs deployment)
- Edge Function calls Node.js → Node.js uses Go Brain

---

## Need User Clarification

**Which architecture are we using?**
1. Do we need the Node.js broker service on Ubuntu VPS?
2. Or has the architecture changed to only use Go Brain?
3. How should the Edge Function communicate with the VPS?
