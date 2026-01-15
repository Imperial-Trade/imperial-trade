# MT5 Sync Debugging Guide

## Current Issue
Trades placed in MT5 terminal (account 800107112, server ECMarketsLtd-Demo) are not syncing to Journal XX Pro.

## Verification Steps

### 1. Check Connection Status
- Click the "Test" button in Journal XX Pro to verify the connection
- Check browser console (F12) for connection logs
- Verify credentials match exactly:
  - Login: 800107112
  - Server: ECMarketsLtd-Demo (must match exactly as shown in MT5 terminal)

### 2. Check Sync Process
When clicking "Sync Now", check:
- Browser console for sync logs:
  - `🔄 Starting trade sync...`
  - `✅ Sync complete: X trades synced`
  - `❌ Sync error...` (if there's an issue)

### 3. Verify VPS Service
- Ensure VPS broker service is running on Windows VPS
- Check if Generic MT5 terminal is running and logged in
- Verify Python script can connect to MT5

### 4. Check Trade Requirements
The sync only fetches **closed trades** (DEAL_ENTRY_OUT):
- Trades must be fully closed (not just opened)
- Trades must be in the last 90 days
- Trades must have both entry and exit deals

### 5. Common Issues

**Server Name Mismatch:**
- MT5 shows: `ECMarketsLtd-Demo`
- Make sure you entered exactly: `ECMarketsLtd-Demo` (not `ECMarkets-MT5-Demo`)

**Connection Not Working:**
- Test connection button will verify credentials
- Check error messages in UI

**No Trades Found:**
- Ensure trades are fully closed
- Check if trades are within last 90 days
- Verify account number matches exactly

## Next Steps
1. Click "Test" button to verify connection
2. Click "Sync Now" to manually trigger sync
3. Check browser console for detailed error messages
4. Share any error messages you see








