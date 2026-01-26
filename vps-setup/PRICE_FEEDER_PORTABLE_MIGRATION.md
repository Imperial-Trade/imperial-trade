# Price Feeder: Moving to Portable Mode

## What Changes vs What Stays the Same

### ✅ **NO CHANGES** (Functionality Identical)
- **Live Prices**: Same prices, same streaming
- **Account**: Still uses EC Markets account 81071266
- **Symbols**: Still streams XAUUSD, BTCUSD, U30USD, SPXUSD, NDXUSD
- **Update Rate**: Still 500ms (5.4 prices/sec)
- **Supabase**: Still sends to same price-ingestor endpoint
- **Website**: Still receives same live prices
- **Performance**: Identical performance

### 🔄 **ONLY CHANGES** (Technical Details)
- **File Location**: 
  - Before: `C:\Program Files\EC Markets MetaTrader 5\terminal64.exe`
  - After: `C:\MT5_PriceFeeder\terminal64.exe`
- **Data Directory**: 
  - Before: Uses AppData\Roaming (shared with other MT5)
  - After: Uses `C:\MT5_PriceFeeder` (isolated)
- **Isolation**: 
  - Before: Shares Windows registry/AppData
  - After: Completely isolated (no sharing)

## Migration Process

1. **Copy EC Markets MT5** to `C:\MT5_PriceFeeder`
2. **Create portable.ini** (forces portable mode)
3. **Update Python script** to use new path
4. **Restart Price Feeder** service
5. **Verify** prices still streaming

## Result

**You will see:**
- ✅ Same live prices on website
- ✅ Same update frequency
- ✅ Same account (81071266)
- ✅ Same symbols
- ✅ **BETTER** isolation (no conflicts)

**You will NOT see:**
- ❌ Any difference in prices
- ❌ Any difference in update speed
- ❌ Any difference in functionality
- ❌ Any downtime (if done correctly)

## Summary

**Moving to portable = ZERO functional changes, MAXIMUM isolation**

It's like moving your house to a private island - same house, same furniture, same everything, just better isolation from neighbors.
