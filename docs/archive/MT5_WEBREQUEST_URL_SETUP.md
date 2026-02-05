# MT5 WebRequest URL Setup

## ⚠️ Important: Add Supabase URL to MT5

If your MQL5 EA (`ImperialSync.mq5`) needs to send data to Supabase, you MUST add the URL to the MT5 WebRequest whitelist.

## Steps to Add URL:

1. In the MT5 Options dialog (Expert Advisors tab)
2. Find "Allow WebRequest for listed URL" section
3. Click "+ add new URL like 'https://www.mql5.com'"
4. Add this URL:
   ```
   https://kmuoqkcxguafxulqlbmi.supabase.co
   ```
5. Click OK to save

## Why This is Needed:

Your EA uses `WebRequest()` to send trade data to:
```
https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/mt5-sync
```

Without this URL in the whitelist, the WebRequest will fail!

## For Both MacBook and VPS:

You need to add this URL in the MT5 Options on:
- **MacBook MT5** (if testing EA locally)
- **VPS MT5** (for production EA)
