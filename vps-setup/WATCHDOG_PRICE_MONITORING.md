# Watchdog Price Monitoring Enhancement

## ✅ What Was Fixed

The watchdog now monitors **both**:
1. **PM2 Process Status** - Checks if Price Feeder PM2 process is online
2. **Price Updates** - Checks if prices are actually updating in the database

## 🔍 How It Works

### Health Check Process:
1. **Check PM2 Status** - Is Price Feeder process online?
2. **Check Price Updates** - Are prices updating in Supabase within last 30 seconds?
3. **Check MT5 Process** - Is MT5 terminal running?

### If Prices Stop Updating:
- Watchdog detects: "⚠️ Prices not updating - Price Feeder may be stuck"
- Watchdog restarts Price Feeder automatically
- Total recovery time: ~15-20 seconds

## 📊 Monitoring

### Check Watchdog Logs:
```powershell
pm2 logs price-feeder-watchdog --lines 50
```

### Look for These Messages:
- `⚠️ [Watchdog] Prices not updating` - Watchdog detected price freeze
- `🔄 [Watchdog] Restarting Price Feeder...` - Watchdog is fixing the issue
- `✅ [Watchdog] Price Feeder restarted successfully` - Issue resolved

## 🎯 Expected Behavior

### Normal Operation:
- Watchdog checks every 10 seconds
- If prices stop updating for 30+ seconds → Watchdog restarts Price Feeder
- If MT5 closes → Watchdog starts MT5 and restarts Price Feeder
- If Price Feeder PM2 process stops → Watchdog restarts it immediately

### Recovery Time:
- Detection: 10-30 seconds (depending on when prices stop)
- Restart: ~5 seconds
- Reconnection: ~5 seconds
- **Total: ~20-40 seconds maximum**

## ⚙️ Configuration

### Check Interval:
- **10 seconds** - Fast detection

### Price Update Threshold:
- **30 seconds** - If no prices updated in 30 seconds, trigger restart

### Restart Threshold:
- **1 failure** - Immediate restart after detection

## 🔧 Troubleshooting

### If Prices Keep Dying:
1. Check Price Feeder logs: `pm2 logs "Imperial Price Feeder" --lines 100`
2. Check MT5 is running: `Get-Process terminal64 | Where-Object { $_.Path -like '*MT5_PriceFeeder*' }`
3. Check watchdog logs: `pm2 logs price-feeder-watchdog --lines 50`
4. Verify MT5 auto-login is configured (password saved)

### Common Issues:
- **MT5 not auto-logging in** → Log in once and save password
- **Price Feeder crashing** → Check logs for Python errors
- **MT5 connection timeout** → Ensure MT5 is running before Price Feeder starts

## ✅ Success Indicators

- Watchdog logs show regular health checks
- Prices update every 1 second in database
- No "Prices not updating" warnings in logs
- Price Feeder restarts automatically when prices freeze
