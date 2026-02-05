# MT5 Expert Advisors Options - Configuration Guide

## ✅ Current Settings Analysis:

### Correct Settings:
- ✅ **Allow algorithmic trading**: Enabled (required for EAs)
- ✅ **Allow DLL imports**: Enabled (if your EA needs DLLs)
- ✅ **Safety features**: Enabled (good practice)
- ✅ **Allow WebRequest**: Enabled

### ⚠️ Missing Configuration:

**"Allow WebRequest for listed URL"** - No URLs are listed!

If your EA needs to send data to Supabase, you must add:
```
https://kmuoqkcxguafxulqlbmi.supabase.co
```

## 📋 Files Location:

**MacBook (Wine/MT5):**
- MetaEditor files are stored in: `~/.wine/drive_c/Program Files/MetaTrader 5/MQL5/`
- These files are NOT accessible by the VPS

**VPS (Ubuntu):**
- MT5 terminal: `/root/imperial-factory/mt5-master/terminal64.exe`
- EA files would be in: `/root/imperial-factory/mt5-master/MQL5/Experts/`
- Separate installation - files must be copied manually

## 🔧 Action Items:

1. Add Supabase URL to WebRequest whitelist in MT5 Options
2. Copy EA files from MacBook to VPS if needed
3. Both systems are independent - no automatic file sharing
