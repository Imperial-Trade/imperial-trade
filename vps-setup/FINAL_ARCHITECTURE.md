# Imperial Trade VPS - Final Architecture

## Complete Isolation of Two Services

### 1. Imperial Price Feeder (PM2 id: 0)
```
┌─────────────────────────────────────────────────────────────┐
│  IMPERIAL PRICE FEEDER                                      │
├─────────────────────────────────────────────────────────────┤
│  MT5 Instance: C:\MT5_PriceFeeder\terminal64.exe            │
│  Mode: Portable (/portable flag)                            │
│  Account: EC Markets (81071266)                             │
│                                                             │
│  PURPOSE:                                                   │
│  • Fetch LIVE GOLD PRICES from EC Markets                   │
│  • Stream prices to Supabase for website display            │
│  • Runs 24/7, never stops                                   │
│  • Single account, always connected                         │
│                                                             │
│  DOES NOT:                                                  │
│  • Handle user connections                                  │
│  • Auto-sync journals                                       │
│  • Fetch user trades                                        │
└─────────────────────────────────────────────────────────────┘
```

### 2. Broker Service (PM2 id: 1)
```
┌─────────────────────────────────────────────────────────────┐
│  IMPERIAL TRADE BROKER SERVICE                              │
├─────────────────────────────────────────────────────────────┤
│  MT5 Instance: C:\MT5_BrokerService\terminal64.exe          │
│  Mode: Portable (/portable flag)                            │
│  Accounts: User's broker (XS, ECMarkets, PUPrime)           │
│                                                             │
│  PURPOSE:                                                   │
│  • TEST BROKER CONNECTIONS (Journal XX Pro login)           │
│  • AUTO-SYNC JOURNAL (fetch trades from user's MT5)         │
│  • Handle 10,000+ simultaneous user connections             │
│  • On-demand connections (not always connected)             │
│                                                             │
│  FEATURES:                                                  │
│  • /test-connection - Verify user credentials               │
│  • /fetch-trades - Get user's closed trades                 │
│  • Auto-sync every 30 seconds for active users              │
└─────────────────────────────────────────────────────────────┘
```

## Why This Separation is Critical

| Feature | Price Feeder | Broker Service |
|---------|-------------|----------------|
| **MT5 Path** | `C:\MT5_PriceFeeder` | `C:\MT5_BrokerService` |
| **Account** | Single (EC Markets) | Multiple users |
| **Connection** | Always connected | On-demand |
| **Purpose** | Live prices for website | Journal auto-sync |
| **Conflicts** | NONE (isolated) | NONE (isolated) |

## File Isolation

Each service has its OWN:
- `terminal64.exe` (separate executable)
- `portable.ini` (forces portable mode)
- `MQL5/` folder (no sharing)
- `Logs/` folder (separate logs)
- `Config/` folder (separate config)
- Data folder (bypasses AppData\Roaming)

## How Auto-Sync Works (Broker Service)

1. **User connects via Journal XX Pro** → Credentials stored in Supabase
2. **Broker Service runs every 30 seconds** → Checks for active connections
3. **For each active user** → Connects to their broker using `C:\MT5_BrokerService`
4. **Fetches closed trades** → Sends to Supabase journal-ingestor
5. **Trades appear in Journal XX Pro** → User sees their synced trades

## Why Price Feeder Uses EC Markets

- EC Markets provides reliable live gold prices (XAUUSD)
- Account 81071266 is dedicated for price streaming
- Prices are sent to Supabase for website display
- This is SEPARATE from user trade syncing

## Desktop Shortcuts

- `MT5_PriceFeeder.lnk` → Start Price Feeder MT5 (EC Markets)
- `MT5_BrokerService.lnk` → Start Broker Service MT5 (for users)

## PM2 Commands

```powershell
# Check status
pm2 status

# Restart Price Feeder
pm2 restart "Imperial Price Feeder"

# Restart Broker Service
pm2 restart "imperial-trade-broker-service"

# View logs
pm2 logs "Imperial Price Feeder"
pm2 logs "imperial-trade-broker-service"
```

## Verification

```powershell
# Check both MT5s are running from correct paths
Get-Process terminal64 | Select-Object Id, Path

# Expected output:
# Id   Path
# --   ----
# xxxx C:\MT5_BrokerService\terminal64.exe
# xxxx C:\MT5_PriceFeeder\terminal64.exe
```
