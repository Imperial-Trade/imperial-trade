# MT5 Launch and Connection Test

## Critical Requirements:

### 1. **MT5 Must Be Launched BEFORE Python Connects**
- Python library connects to an **existing** MT5 process
- MT5 must be fully initialized (wait 20 seconds after launch)
- Use `/portable` flag when launching MT5
- Use `portable=True` in Python `mt5.initialize()`

### 2. **Correct Launch Command:**
```bash
DISPLAY=:101 xvfb-run -a -s '-screen 0 1024x768x24' wine64 'C:\\imperial-factory\\mt5-master\\terminal64.exe' /portable
```

### 3. **Startup Script Created:**
- Location: `/root/start-mt5.sh`
- Kills existing processes
- Launches MT5 correctly
- Waits 20 seconds for initialization

### 4. **Batch Sync Optimization Applied:**
- Changed from 90 days to **24 hours** in `fetch_trades.py`
- Uses `mt5.history_deals_get()` for batch fetching
- Reduces load on MT5 terminal
- Allows 1,000 users to hit Supabase while only 1 script hits MT5

## Test Process:
1. Launch MT5 using startup script
2. Wait 20 seconds for full initialization
3. Test Python connection to existing MT5 process
4. Attempt login with credentials
5. Get account info and trade history

## Expected Result:
- MT5 initializes successfully
- Login completes
- Account info retrieved
- Trade history fetched (last 24 hours)
