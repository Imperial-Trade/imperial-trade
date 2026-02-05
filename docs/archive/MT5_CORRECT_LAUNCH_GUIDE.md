# MT5 Correct Launch Guide

## Critical Requirements for MT5 to Work with Python:

### 1. **MT5 Must Be Launched BEFORE Python Connects**
- Python library connects to an **existing** MT5 process
- MT5 must be fully initialized before Python tries to connect
- Wait 15-20 seconds after launching MT5 before testing Python connection

### 2. **Launch Command:**
```bash
DISPLAY=:101 xvfb-run -a -s '-screen 0 1024x768x24' wine64 'C:\\imperial-factory\\mt5-master\\terminal64.exe' /portable
```

### 3. **Portable Mode is Critical:**
- Use `/portable` flag when launching MT5
- Use `portable=True` in Python `mt5.initialize()`
- This keeps MT5 settings isolated and prevents registry conflicts

### 4. **GUI Session Required:**
- MT5 needs an active GUI session (Xvfb provides this)
- Screen resolution: 1024x768x24 (minimum)
- Display must be active before MT5 launches

## Batch Sync Optimization:

### Use `history_deals_get()` for Last 24 Hours:
```python
from datetime import datetime, timedelta
import MetaTrader5 as mt5

# Get last 24 hours
date_from = datetime.now() - timedelta(days=1)
date_to = datetime.now()

# Fetch deals in batch
deals = mt5.history_deals_get(date_from, date_to)
```

This reduces load on MT5 terminal by fetching only recent data.

## Local Cache Strategy:
1. Python reads MT5 history
2. Python pushes to Supabase
3. Frontend only talks to Supabase
4. Result: 1,000 users hit Supabase, only 1 script hits MT5
