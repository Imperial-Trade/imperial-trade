# VPS Service Verification Guide

## Critical Finding

**The VPS is Ubuntu (not Windows)**, but:
- ✅ Go Brain service is running (imperial-brain.service)
- ❌ Node.js broker service is NOT running (port 3001 not listening)
- ❌ No PM2 processes found
- ❌ No service listening on port 3001

## Architecture Clarification Needed

The Edge Function `sync-broker-trades` calls:
- `${VPS_MT5_SERVICE_URL}/fetch-trades` (which is `http://209.222.12.247:3001/fetch-trades`)

This endpoint should be handled by the Node.js broker service, but it's NOT running.

---

## Questions to Answer:

1. Is the Node.js broker service needed on Ubuntu VPS?
2. Or does Go Brain handle everything now?
3. What service should handle the `/fetch-trades` endpoint?

Investigating...
