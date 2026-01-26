#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MT5 Error Handler
Comprehensive error handling using official MT5 Python API last_error()
Reference: https://www.mql5.com/en/docs/python_metatrader5/mt5lasterror_py
"""

import MetaTrader5 as mt5

# MT5 Error Codes (per official API documentation)
MT5_ERROR_CODES = {
    1: "RES_S_OK - Generic success",
    -1: "RES_E_FAIL - Generic fail",
    -2: "RES_E_INVALID_PARAMS - Invalid arguments/parameters",
    -3: "RES_E_NO_MEMORY - No memory condition",
    -4: "RES_E_NOT_FOUND - No history",
    -5: "RES_E_INVALID_VERSION - Invalid version",
    -6: "RES_E_AUTH_FAILED - Authorization failed",
    -7: "RES_E_UNSUPPORTED - Unsupported method",
    -8: "RES_E_AUTO_TRADING_DISABLED - Auto-trading disabled",
    -10000: "RES_E_INTERNAL_FAIL - Internal IPC general error",
    -10001: "RES_E_INTERNAL_FAIL_SEND - Internal IPC send failed",
    -10002: "RES_E_INTERNAL_FAIL_RECEIVE - Internal IPC recv failed",
    -10003: "RES_E_INTERNAL_FAIL_INIT - Internal IPC initialization fail / no IPC",
    -10005: "RES_E_INTERNAL_FAIL_TIMEOUT - Internal timeout"
}

def get_last_error():
    """
    Get last MT5 error with code and description
    Returns: tuple (error_code, error_description) or None
    """
    error = mt5.last_error()
    if error:
        error_code = error[0] if isinstance(error, tuple) else None
        error_msg = error[1] if isinstance(error, tuple) else str(error)
        return (error_code, error_msg)
    return None

def get_error_message(error_code, error_msg, context=""):
    """
    Get user-friendly error message based on error code
    """
    if error_code is None:
        return error_msg if error_msg else "Unknown error"
    
    # Map error codes to user-friendly messages
    if error_code == 1:  # RES_S_OK
        return "Success"
    
    elif error_code == -1:  # RES_E_FAIL
        return f"Operation failed: {error_msg}"
    
    elif error_code == -2:  # RES_E_INVALID_PARAMS
        return f"Invalid parameters: {error_msg}. Please verify your credentials are correct."
    
    elif error_code == -3:  # RES_E_NO_MEMORY
        return f"Insufficient memory: {error_msg}. Try closing other applications."
    
    elif error_code == -4:  # RES_E_NOT_FOUND
        return f"Data not found: {error_msg}. No history available for the requested period."
    
    elif error_code == -5:  # RES_E_INVALID_VERSION
        return f"Invalid MT5 version: {error_msg}. Please update MetaTrader 5."
    
    elif error_code == -6:  # RES_E_AUTH_FAILED
        return f"Authorization failed: {error_msg}. Please verify your login ID, password, and server name are correct."
    
    elif error_code == -7:  # RES_E_UNSUPPORTED
        return f"Unsupported method: {error_msg}. This operation is not supported by your broker."
    
    elif error_code == -8:  # RES_E_AUTO_TRADING_DISABLED
        return f"Auto-trading disabled: {error_msg}. Please enable 'Allow Algorithmic Trading' in MT5: Tools -> Options -> Expert Advisors -> Allow Algorithmic Trading"
    
    elif error_code == -10000:  # RES_E_INTERNAL_FAIL
        return f"Internal IPC error: {error_msg}. MT5 communication failed. Try: 1) Restart MT5, 2) Check if MT5 is running, 3) Verify MT5 is not blocked by firewall."
    
    elif error_code == -10001:  # RES_E_INTERNAL_FAIL_SEND
        return f"IPC send failed: {error_msg}. Failed to send data to MT5. Try restarting MT5."
    
    elif error_code == -10002:  # RES_E_INTERNAL_FAIL_RECEIVE
        return f"IPC receive failed: {error_msg}. Failed to receive data from MT5. Try restarting MT5."
    
    elif error_code == -10003:  # RES_E_INTERNAL_FAIL_INIT or RES_E_INTERNAL_FAIL_CONNECT
        return f"IPC initialization/connection failed: {error_msg}. MT5 is not accessible. Try: 1) Restart MT5, 2) Log in manually once, 3) Keep MT5 terminal open, 4) Run as Administrator."
    
    elif error_code == -10005:  # RES_E_INTERNAL_FAIL_TIMEOUT
        return f"IPC timeout: {error_msg}. MT5 did not respond in time. Try: 1) Check network connection, 2) Verify server name is correct, 3) Restart MT5."
    
    else:
        # Unknown error code
        error_name = MT5_ERROR_CODES.get(error_code, f"Unknown error code: {error_code}")
        return f"{error_name}: {error_msg}"

def check_error(operation_name="operation"):
    """
    Check for errors after an MT5 operation
    Returns: (has_error, error_code, error_message) or (False, None, None)
    """
    error = get_last_error()
    if error:
        error_code, error_msg = error
        # Error code 1 is success, so ignore it
        if error_code != 1:
            friendly_msg = get_error_message(error_code, error_msg, operation_name)
            return (True, error_code, friendly_msg)
    return (False, None, None)

def format_error_response(error_code, error_msg, context=""):
    """
    Format error response for API
    """
    friendly_msg = get_error_message(error_code, error_msg, context)
    error_name = MT5_ERROR_CODES.get(error_code, f"Error {error_code}")
    
    return {
        "error": friendly_msg,
        "error_code": error_code,
        "error_name": error_name,
        "error_details": error_msg,
        "context": context
    }

