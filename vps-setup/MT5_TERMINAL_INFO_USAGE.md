# MT5 terminal_info() - Comprehensive Usage Guide

## Official API Reference
https://www.mql5.com/en/docs/python_metatrader5/mt5terminalinfo_py

## Function Signature
```python
terminal_info = mt5.terminal_info()
```

## Return Value
- Returns a `namedtuple` structure with terminal status and settings
- Returns `None` if error (check `mt5.last_error()`)

## Key Properties

### Critical Properties for Trading Software

| Property | Type | Description | Critical For |
|----------|------|------------|--------------|
| `connected` | bool | Terminal connection status | **All operations** |
| `trade_allowed` | bool | Algorithmic trading enabled | **Trade fetching, API operations** |
| `dlls_allowed` | bool | DLL imports allowed | Expert Advisors |
| `tradeapi_disabled` | bool | Trade API disabled | Trade operations |
| `name` | str | Terminal name | Diagnostics |
| `company` | str | Company name | Diagnostics |
| `build` | int | Build number | Version checking |
| `path` | str | Terminal path | Path verification |
| `maxbars` | int | Max bars in chart | Data limits |
| `codepage` | int | Code page | Encoding |
| `ping_last` | int | Last ping time | Connection quality |
| `language` | str | Terminal language | Localization |

## Usage Pattern

### 1. Basic Check
```python
terminal_info = mt5.terminal_info()
if not terminal_info:
    error = mt5.last_error()
    print(f"Error getting terminal info: {error}")
    return
```

### 2. Verify Connection
```python
if not terminal_info.connected:
    print("Terminal is not connected")
    return
```

### 3. Check Algorithmic Trading (CRITICAL)
```python
if not terminal_info.trade_allowed:
    print("⚠️  Algorithmic Trading is NOT enabled")
    print("   This will cause issues with trade fetching")
    print("   Enable: Tools -> Options -> Expert Advisors -> Allow Algorithmic Trading")
```

### 4. Display All Properties
```python
# Convert to dictionary (per official API example)
terminal_dict = terminal_info._asdict()
for prop, value in terminal_dict.items():
    print(f"  {prop}={value}")
```

## Complete Example

```python
import MetaTrader5 as mt5

# Initialize
if not mt5.initialize():
    print("Initialize failed:", mt5.last_error())
    quit()

# Get terminal info
terminal_info = mt5.terminal_info()
if terminal_info:
    print("Terminal Info:")
    print(f"  Name: {terminal_info.name}")
    print(f"  Company: {terminal_info.company}")
    print(f"  Build: {terminal_info.build}")
    print(f"  Connected: {terminal_info.connected}")
    print(f"  Trade Allowed: {terminal_info.trade_allowed}")
    print(f"  DLLs Allowed: {terminal_info.dlls_allowed}")
    
    # Check critical settings
    if not terminal_info.connected:
        print("⚠️  Terminal is not connected")
    
    if not terminal_info.trade_allowed:
        print("⚠️  Algorithmic Trading is NOT enabled")
    
    # Display all properties
    print("\nAll Properties:")
    terminal_dict = terminal_info._asdict()
    for prop, value in terminal_dict.items():
        print(f"  {prop}={value}")
else:
    print("Failed to get terminal info:", mt5.last_error())

mt5.shutdown()
```

## Implementation in Our Code

### test_connection.py
```python
# After initialize(), verify terminal is ready
terminal_info = mt5.terminal_info()
if not terminal_info:
    mt5.shutdown()
    return {"connected": False, "error": "Terminal not ready"}

# Verify connection
if not terminal_info.connected:
    mt5.shutdown()
    return {"connected": False, "error": "Terminal not connected"}

# Check algorithmic trading
if not terminal_info.trade_allowed:
    print("⚠️  WARNING: Algorithmic Trading is NOT enabled")
    # Continue anyway, but warn user
```

### fetch_trades.py
```python
# Verify terminal is ready
terminal_info = mt5.terminal_info()
if not terminal_info or not terminal_info.connected:
    mt5.shutdown()
    return {"trades": [], "error": "Terminal not ready"}

# Check algorithmic trading (critical for trade fetching)
if not terminal_info.trade_allowed:
    print("⚠️  WARNING: Algorithmic Trading is NOT enabled")
    # Trades may not be fetchable
```

## Diagnostic Script

Created `check_terminal_status.py` to check terminal status:
```bash
python check_terminal_status.py
```

Returns comprehensive terminal info in JSON format.

## Status

✅ **All scripts updated** to use `terminal_info()` comprehensively
✅ **Connection verification** using `terminal_info.connected`
✅ **Algorithmic trading check** using `terminal_info.trade_allowed`
✅ **Comprehensive diagnostics** using all terminal_info properties

## References

- Official Documentation: https://www.mql5.com/en/docs/python_metatrader5/mt5terminalinfo_py
- Example Usage: See official documentation examples

