# MT5 Python API Best Practices

## Official Documentation
Reference: https://www.mql5.com/en/docs/python_metatrader5

## Key Functions

### 1. initialize()
```python
mt5.initialize(path="C:\\Program Files\\MetaTrader 5\\terminal64.exe")
```
- Establishes connection with MT5 terminal
- Returns `True` on success, `False` on failure
- Always check `mt5.last_error()` if it returns `False`

### 2. login()
```python
mt5.login(
    login,                    # account number (required)
    password="PASSWORD",      # password (optional - uses saved if not provided)
    server="SERVER",          # server name (optional - uses last used if not provided)
    timeout=30000            # timeout in milliseconds (optional - default is 60000)
)
```
- **CRITICAL**: The `timeout` parameter is built-in (no need for threading!)
- Default timeout: 60000ms (60 seconds)
- Recommended: 30000ms (30 seconds) for faster failure detection
- Returns `True` on success, `False` on failure
- Always check `mt5.last_error()` if it returns `False`

### 3. account_info()
```python
account_info = mt5.account_info()
```
- Returns account information object
- Includes: login, balance, equity, server, currency, leverage, etc.
- Returns `None` if not logged in

### 4. terminal_info()
```python
terminal_info = mt5.terminal_info()
```
- Returns terminal information object
- Includes: `trade_allowed` (algorithmic trading enabled)
- Returns `None` if MT5 not initialized

### 5. shutdown()
```python
mt5.shutdown()
```
- Closes connection to MT5 terminal
- **IMPORTANT**: Only call if YOU initialized the connection
- Don't shutdown if MT5 was already running (e.g., for price feeder)

## Best Practices

### 1. Always Use Timeout Parameter
```python
# ✅ CORRECT - Use built-in timeout
authorized = mt5.login(login, password=password, server=server, timeout=30000)

# ❌ WRONG - Don't use threading for timeout
# The API has built-in timeout support!
```

### 2. Check Errors Properly
```python
if not mt5.initialize():
    error = mt5.last_error()
    error_code = error[0] if isinstance(error, tuple) else None
    error_msg = error[1] if isinstance(error, tuple) else str(error)
    print(f"Initialization failed: {error_code} - {error_msg}")
```

### 3. Verify Terminal is Ready
```python
# After initialize(), verify terminal is actually ready
terminal_info = mt5.terminal_info()
if not terminal_info:
    # MT5 not fully initialized
    mt5.shutdown()
    return error
```

### 4. Check Algorithmic Trading
```python
terminal_info = mt5.terminal_info()
if terminal_info and not terminal_info.trade_allowed:
    print("WARNING: Algorithmic Trading is NOT enabled")
    # This will cause issues with trade fetching
```

### 5. Handle Login Errors
```python
if not authorized:
    error = mt5.last_error()
    error_code = error[0] if isinstance(error, tuple) else None
    error_msg = error[1] if isinstance(error, tuple) else str(error)
    
    # Common error codes:
    # 10004 = TRADE_RETCODE_INVALID_ACCOUNT
    # 10003 = TRADE_RETCODE_INVALID_PASSWORD
```

### 6. Always Shutdown if You Initialized
```python
initialized_by_us = False
try:
    if mt5.initialize():
        initialized_by_us = True
        # ... do work ...
finally:
    if initialized_by_us:
        mt5.shutdown()  # Only shutdown if we initialized
```

## Common Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| 10004 | Invalid account | Verify login ID and server name |
| 10003 | Invalid password | Verify password is correct |
| Timeout | Connection timeout | Check network, server name, MT5 popups |

## Complete Example

```python
import MetaTrader5 as mt5
import time

# Initialize
if not mt5.initialize(path=r"C:\Program Files\MetaTrader 5\terminal64.exe"):
    error = mt5.last_error()
    print(f"Initialize failed: {error}")
    quit()

# Wait for IPC pipe to open (Windows-specific)
time.sleep(1)

# Verify terminal is ready
terminal_info = mt5.terminal_info()
if not terminal_info:
    mt5.shutdown()
    print("Terminal not ready")
    quit()

# Login with timeout
authorized = mt5.login(
    login=800107112,
    password="your_password",
    server="ECMarketsLtd-Demo",
    timeout=30000  # 30 seconds
)

if not authorized:
    error = mt5.last_error()
    print(f"Login failed: {error}")
    mt5.shutdown()
    quit()

# Get account info
account_info = mt5.account_info()
print(f"Connected to account: {account_info.login}")
print(f"Balance: {account_info.balance}")
print(f"Server: {account_info.server}")

# Shutdown
mt5.shutdown()
```

## References
- Official Documentation: https://www.mql5.com/en/docs/python_metatrader5
- Login Function: https://www.mql5.com/en/docs/python_metatrader5/mt5login_py
- Initialize Function: https://www.mql5.com/en/docs/python_metatrader5/mt5initialize_py

