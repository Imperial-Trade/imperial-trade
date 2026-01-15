# MT5 Connection Fix Summary

## Issues Fixed

### 1. ✅ Server Name Handling
- **Problem**: Server name variations (e.g., "ECMarketsLtd-Demo" vs "ECMarkets-MT5-Demo") caused connection failures
- **Solution**: Created `server-name-normalizer.ts` that:
  - Automatically normalizes common server name variations
  - Tries multiple variations if the first one fails
  - Case-insensitive matching
  - Maps known variations to canonical names

### 2. ✅ Robust PM2 Configuration
- **Created**: `ecosystem.config.js` for PM2 process management
- **Features**:
  - Auto-restart on crashes
  - Logging to files
  - Memory limits
  - Graceful shutdown
  - Health monitoring

### 3. ✅ Enhanced Error Messages
- **Improved**: Error handling throughout the sync chain
- **Added**: Diagnostic endpoint (`/diagnostics`) for comprehensive connection testing
- **Better**: User-friendly error messages with troubleshooting tips

### 4. ✅ Connection Diagnostics
- **New Endpoint**: `/diagnostics` provides:
  - Server name normalization results
  - MT5 connection test
  - Trade fetch capability test
  - Detailed error information

## Files Created/Modified

### Created:
1. `vps-broker-service/ecosystem.config.js` - PM2 configuration
2. `vps-broker-service/src/server-name-normalizer.ts` - Server name handling
3. `vps-broker-service/MT5_CONNECTION_SETUP_GUIDE.md` - Complete setup guide
4. `vps-broker-service/logs/` - Log directory

### Modified:
1. `vps-broker-service/src/mt5-client.ts` - Added server name normalization
2. `vps-broker-service/src/index.ts` - Added diagnostics endpoint
3. `src/components/journal-xx/AutoJournalView.tsx` - Improved error messages

## Next Steps

### On Windows VPS:

1. **Build the service:**
   ```bash
   cd vps-broker-service
   npm install
   npm run build
   ```

2. **Create `.env` file:**
   ```env
   PORT=3001
   VPS_API_KEY=your-secure-api-key
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-key
   INGEST_SECRET=your-secret
   SYNC_INTERVAL=30000
   ```

3. **Start with PM2:**
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

4. **Verify it's running:**
   ```bash
   pm2 status
   pm2 logs imperial-trade-broker-service
   ```

### In Supabase Dashboard:

1. **Edge Functions → Settings → Secrets:**
   - Add `VPS_MT5_SERVICE_URL` = `http://your-vps-ip:3001`
   - Add `VPS_API_KEY` = same key as in `.env`

2. **Test Connection:**
   - Use "Test" button in Journal XX Pro
   - Check diagnostics if issues persist

## Server Name Support

The system now handles these variations automatically:

- ✅ `ECMarketsLtd-Demo` (as shown in MT5)
- ✅ `ECMarkets-MT5-Demo`
- ✅ `ecmarketsltd-demo` (case-insensitive)
- ✅ `ECMarketsLtd-Demo` (original preserved)

## Troubleshooting

### Connection Issues:
1. Check PM2 status: `pm2 status`
2. Check logs: `pm2 logs imperial-trade-broker-service`
3. Verify MT5 terminal is open and logged in
4. Test diagnostics endpoint: `POST /diagnostics`

### Sync Issues:
1. Verify trades are fully closed (not just opened)
2. Check trades are within last 90 days
3. Verify server name matches MT5 terminal exactly
4. Check auto-sync logs in PM2

### VPS Service Issues:
1. Restart: `pm2 restart imperial-trade-broker-service`
2. Check health: `curl http://localhost:3001/health`
3. Verify environment variables are set
4. Check firewall allows port 3001

## Architecture Flow

```
Journal XX Pro
    ↓ (sync-broker-trades Edge Function)
VPS Node.js Service (Port 3001)
    ↓ (Python subprocess)
Generic MT5 Terminal
    ↓ (MT5 API)
Broker Server (ECMarketsLtd-Demo)
```

## Key Improvements

1. **Automatic Server Name Handling**: No need to match exact server name anymore
2. **Better Error Messages**: Clear, actionable error messages
3. **Diagnostics Endpoint**: Comprehensive connection testing
4. **Robust Process Management**: PM2 ensures service stays running
5. **Auto-Retry**: Server name variations tried automatically

## Verification Checklist

- [ ] VPS service built and running
- [ ] PM2 managing the service
- [ ] Environment variables configured
- [ ] Supabase Edge Function secrets set
- [ ] MT5 terminal open and logged in
- [ ] Connection test passes
- [ ] Trades sync successfully

## Notes

- The service uses **Generic MT5 Terminal** (not EC Markets MT5)
- EC Markets MT5 is reserved for live price feeds only
- Server names are normalized but original is preserved
- Auto-sync runs every 30 seconds (configurable)
- All trades must be **fully closed** to sync








