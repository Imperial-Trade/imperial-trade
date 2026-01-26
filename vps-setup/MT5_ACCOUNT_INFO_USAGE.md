# MT5 account_info() - Comprehensive Usage Guide

## Official API Reference
https://www.mql5.com/en/docs/python_metatrader5/mt5accountinfo_py

## Function Signature
```python
account_info = mt5.account_info()
```

## Return Value
- Returns a `namedtuple` structure with account information
- Returns `None` if error (check `mt5.last_error()`)
- Must be logged in to get account info

## Key Properties

### Account Identification
| Property | Type | Description |
|----------|------|-------------|
| `login` | int | Trading account number |
| `name` | str | Account holder name |
| `server` | str | Trade server name |
| `company` | str | Broker company name |
| `currency` | str | Account currency |

### Trading Settings
| Property | Type | Description |
|----------|------|-------------|
| `leverage` | int | Account leverage (e.g., 100 = 1:100) |
| `trade_mode` | int | Trading mode (0=Demo, 1=Contest, 2=Real) |
| `margin_mode` | int | Margin calculation mode |
| `trade_allowed` | bool | Trading allowed |
| `trade_expert` | bool | Expert advisors allowed |
| `fifo_close` | bool | FIFO close mode |
| `limit_orders` | int | Maximum pending orders |
| `currency_digits` | int | Currency decimal places |

### Account Balance Info
| Property | Type | Description |
|----------|------|-------------|
| `balance` | float | Account balance |
| `equity` | float | Account equity |
| `profit` | float | Current profit/loss |
| `credit` | float | Credit amount |
| `margin` | float | Used margin |
| `margin_free` | float | Free margin |
| `margin_level` | float | Margin level percentage |
| `margin_so_call` | float | Margin stop out call level |
| `margin_so_so` | float | Margin stop out level |
| `margin_initial` | float | Initial margin |
| `margin_maintenance` | float | Maintenance margin |
| `assets` | float | Assets value |
| `liabilities` | float | Liabilities value |
| `commission_blocked` | float | Blocked commission |

## Usage Pattern

### 1. Basic Usage
```python
account_info = mt5.account_info()
if account_info:
    print(f"Account: {account_info.login}")
    print(f"Balance: {account_info.balance} {account_info.currency}")
else:
    error = mt5.last_error()
    print(f"Error: {error}")
```

### 2. Convert to Dictionary (Per Official API)
```python
account_info = mt5.account_info()
if account_info:
    account_dict = account_info._asdict()
    for prop, value in account_dict.items():
        print(f"{prop}={value}")
```

### 3. Comprehensive Account Info
```python
account_info = mt5.account_info()
if account_info:
    result = {
        "login": account_info.login,
        "name": account_info.name,
        "server": account_info.server,
        "balance": account_info.balance,
        "equity": account_info.equity,
        "currency": account_info.currency,
        "leverage": account_info.leverage,
        "trade_allowed": account_info.trade_allowed,
        "margin": account_info.margin,
        "margin_free": account_info.margin_free,
        "margin_level": account_info.margin_level
    }
```

## Implementation in Our Code

### test_connection.py
```python
# After successful login, get account info
account_info = mt5.account_info()
if not account_info:
    return {"connected": False, "error": "Failed to get account info"}

# Return comprehensive account info
result = {
    "connected": True,
    "account_info": {
        "login": account_info.login,
        "name": account_info.name,
        "server": account_info.server,
        "balance": account_info.balance,
        "equity": account_info.equity,
        "currency": account_info.currency,
        "leverage": account_info.leverage,
        "trade_allowed": account_info.trade_allowed,
        # ... more properties
    }
}
```

### fetch_trades.py
```python
# Get account info along with trades
account_info = mt5.account_info()
return {
    "trades": trades,
    "account_info": {
        "login": account_info.login,
        "server": account_info.server,
        "balance": account_info.balance,
        "equity": account_info.equity,
        "currency": account_info.currency,
        "profit": account_info.profit,
        "margin": account_info.margin,
        "margin_free": account_info.margin_free,
        "margin_level": account_info.margin_level
    }
}
```

## Complete Example

```python
import MetaTrader5 as mt5

# Initialize and login
if not mt5.initialize(login=25115284, password="password", server="Server"):
    print("Initialize failed:", mt5.last_error())
    quit()

# Get account info
account_info = mt5.account_info()
if account_info:
    # Display as-is
    print(account_info)
    
    # Display as dictionary
    account_dict = account_info._asdict()
    for prop, value in account_dict.items():
        print(f"{prop}={value}")
    
    # Access specific properties
    print(f"Account: {account_info.login}")
    print(f"Balance: {account_info.balance} {account_info.currency}")
    print(f"Equity: {account_info.equity} {account_info.currency}")
    print(f"Margin Level: {account_info.margin_level}%")
else:
    print("Failed to get account info:", mt5.last_error())

mt5.shutdown()
```

## Status

✅ **All scripts updated** to use `account_info()` comprehensively
✅ **Comprehensive data return** - All important account properties included
✅ **Official API compliance** - Using `_asdict()` per official examples
✅ **Better frontend data** - More account details available for display

## References

- Official Documentation: https://www.mql5.com/en/docs/python_metatrader5/mt5accountinfo_py
- Example Usage: See official documentation examples

