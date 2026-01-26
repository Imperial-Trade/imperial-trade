# MT5 version() - Usage Guide

## Official API Reference
https://www.mql5.com/en/docs/python_metatrader5/mt5version_py

## Function Signature
```python
version = mt5.version()
```

## Return Value
- Returns a tuple of three values: `(version, build, release_date)`
- Returns `None` if error (check `mt5.last_error()`)
- Must initialize MT5 first before calling `version()`

## Return Value Structure

| Index | Type | Description | Example |
|-------|------|-------------|---------|
| 0 | int | MetaTrader 5 terminal version | 500 |
| 1 | int | Build number | 2367 |
| 2 | str | Build release date | '23 Mar 2020' |

## Usage Pattern

### 1. Basic Usage
```python
mt5_version = mt5.version()
if mt5_version:
    version_major, build, release_date = mt5_version
    print(f"MT5 Version: {version_major}, Build: {build}, Release: {release_date}")
else:
    print("Could not get MT5 version")
```

### 2. Unpacking Tuple
```python
version = mt5.version()
if version:
    version_major, build, release_date = version
    print(f"Version: {version_major}")
    print(f"Build: {build}")
    print(f"Release: {release_date}")
```

### 3. Include in Response
```python
mt5_version = mt5.version()
version_info = None
if mt5_version:
    version_major, build, release_date = mt5_version
    version_info = {
        "version": version_major,
        "build": build,
        "release_date": release_date
    }

result = {
    "connected": True,
    "mt5_version": version_info,
    "account_info": {...}
}
```

## Complete Example

```python
import MetaTrader5 as mt5

# Initialize MT5
if not mt5.initialize():
    print("Initialize failed:", mt5.last_error())
    quit()

# Get version
version = mt5.version()
if version:
    version_major, build, release_date = version
    print(f"MT5 Version: {version_major}")
    print(f"Build: {build}")
    print(f"Release Date: {release_date}")
    
    # Example output:
    # MT5 Version: 500
    # Build: 2367
    # Release Date: 23 Mar 2020
else:
    print("Could not get version:", mt5.last_error())

mt5.shutdown()
```

## Implementation in Our Code

### test_connection.py
```python
# After successful initialization
mt5_version = mt5.version()
if mt5_version:
    version_major, build, release_date = mt5_version
    print(f"MT5 Version: {version_major}, Build: {build}, Release: {release_date}")

# Include in response
result = {
    "connected": True,
    "mt5_version": {
        "version": version_major,
        "build": build,
        "release_date": release_date
    },
    "account_info": {...}
}
```

### fetch_trades.py
```python
# After initialization
mt5_version = mt5.version()
if mt5_version:
    version_major, build, release_date = mt5_version
    print(f"MT5 Version: {version_major}, Build: {build}, Release: {release_date}")
```

### check_terminal_status.py
```python
# Get version for diagnostics
mt5_version = mt5.version()
version_info = None
if mt5_version:
    version_major, build, release_date = mt5_version
    version_info = {
        "version": version_major,
        "build": build,
        "release_date": release_date
    }

result = {
    "status": "ok",
    "mt5_version": version_info,
    "terminal_info": {...}
}
```

## Use Cases

1. **Diagnostics**: Verify MT5 version compatibility
2. **Logging**: Include version in logs for troubleshooting
3. **API Response**: Return version info to frontend
4. **Version Checking**: Ensure compatible MT5 version

## Status

✅ **All scripts updated** to use `mt5.version()`
✅ **Version info included** in responses
✅ **Diagnostics enhanced** with version information
✅ **Official API compliance** - Following official documentation

## References

- Official Documentation: https://www.mql5.com/en/docs/python_metatrader5/mt5version_py
- Example Usage: See official documentation examples

