# MT5 Error Handling - Comprehensive Guide

## Official API Reference
https://www.mql5.com/en/docs/python_metatrader5/mt5lasterror_py

## Function Signature
```python
error = mt5.last_error()
```

## Return Value
- Returns a tuple: `(error_code, error_description)`
- Returns `None` if no error
- Must check after every MT5 operation

## Error Codes (Per Official API)

| Code | Constant | Description |
|------|----------|-------------|
| 1 | RES_S_OK | Generic success |
| -1 | RES_E_FAIL | Generic fail |
| -2 | RES_E_INVALID_PARAMS | Invalid arguments/parameters |
| -3 | RES_E_NO_MEMORY | No memory condition |
| -4 | RES_E_NOT_FOUND | No history |
| -5 | RES_E_INVALID_VERSION | Invalid version |
| -6 | RES_E_AUTH_FAILED | Authorization failed |
| -7 | RES_E_UNSUPPORTED | Unsupported method |
| -8 | RES_E_AUTO_TRADING_DISABLED | Auto-trading disabled |
| -10000 | RES_E_INTERNAL_FAIL | Internal IPC general error |
| -10001 | RES_E_INTERNAL_FAIL_SEND | Internal IPC send failed |
| -10002 | RES_E_INTERNAL_FAIL_RECEIVE | Internal IPC recv failed |
| -10003 | RES_E_INTERNAL_FAIL_INIT | Internal IPC initialization fail / no IPC |
| -10005 | RES_E_INTERNAL_FAIL_TIMEOUT | Internal timeout |

## Usage Pattern

### 1. Basic Error Checking
```python
if not mt5.initialize():
    error = mt5.last_error()
    if error:
        error_code, error_msg = error
        print(f"Error {error_code}: {error_msg}")
```

### 2. Using Error Handler Module
```python
from mt5_error_handler import get_last_error, get_error_message, format_error_response

# After operation
error = get_last_error()
if error:
    error_code, error_msg = error
    error_response = format_error_response(error_code, error_msg, "operation name")
    return {"error": error_response["error"], "error_code": error_code}
```

### 3. Comprehensive Error Handling
```python
from mt5_error_handler import check_error

# After operation
has_error, error_code, error_msg = check_error("operation name")
if has_error:
    return {"error": error_msg, "error_code": error_code}
```

## Implementation in Our Code

### test_connection.py
```python
from mt5_error_handler import get_last_error, format_error_response

# After initialize()
if not initialized:
    error = get_last_error()
    if error:
        error_code, error_msg = error
        error_response = format_error_response(error_code, error_msg, "MT5 initialization/login")
        return {"connected": False, **error_response}
```

### fetch_trades.py
```python
from mt5_error_handler import get_last_error, format_error_response

# After history_deals_get()
if deals is None:
    error = get_last_error()
    if error:
        error_code, error_msg = error
        error_response = format_error_response(error_code, error_msg, "fetch deals")
        return {"trades": [], **error_response}
```

## Error Response Format

```json
{
  "error": "User-friendly error message",
  "error_code": -10003,
  "error_name": "RES_E_INTERNAL_FAIL_INIT",
  "error_details": "Internal IPC initialization fail",
  "context": "MT5 initialization/login"
}
```

## Common Error Scenarios

### 1. IPC Connection Failed (-10003)
**Cause**: MT5 not running or not accessible
**Solution**: 
- Restart MT5
- Log in manually once
- Keep MT5 terminal open
- Run as Administrator

### 2. Authorization Failed (-6)
**Cause**: Incorrect credentials
**Solution**:
- Verify login ID, password, and server name
- Check server name is case-sensitive
- Ensure account exists on specified server

### 3. Auto-Trading Disabled (-8)
**Cause**: Algorithmic trading not enabled
**Solution**:
- Enable in MT5: Tools -> Options -> Expert Advisors -> Allow Algorithmic Trading
- Or run: `ENABLE_ALGORITHMIC_TRADING_REGISTRY.ps1`

### 4. IPC Timeout (-10005)
**Cause**: MT5 did not respond in time
**Solution**:
- Check network connection
- Verify server name is correct
- Restart MT5

## Best Practices

1. **Always Check Errors**: Check `last_error()` after every MT5 operation
2. **Use Error Handler**: Use `mt5_error_handler.py` for consistent error handling
3. **Provide Context**: Include operation name in error context
4. **User-Friendly Messages**: Map error codes to actionable messages
5. **Include Error Codes**: Return error codes for debugging

## Status

✅ **Error handler module created** (`mt5_error_handler.py`)
✅ **All scripts updated** to use comprehensive error handling
✅ **Error codes mapped** to user-friendly messages
✅ **Error responses enhanced** with codes and details
✅ **Official API compliance** - Following official documentation

## References

- Official Documentation: https://www.mql5.com/en/docs/python_metatrader5/mt5lasterror_py
- Error Codes: See official documentation for complete list

