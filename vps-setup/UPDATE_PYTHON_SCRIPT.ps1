# Update test_connection.py with better logging
$filePath = "C:\vps-broker-service\python\test_connection.py"

$content = @'
#!/usr/bin/env python3
"""
Test MT5 Connection
Tests login to MT5 broker and returns account info
"""

import sys
import json
import MetaTrader5 as mt5
import time

def test_connection(login, password, server):
    """Test MT5 connection and return account info
    CRITICAL: Uses ONLY Generic MT5 (NOT EC Markets MT5) to avoid interfering with price feeder
    """
    initialized_by_us = False
    try:
        # CRITICAL: Use ONLY Generic MT5 path (NOT EC Markets MT5)
        generic_mt5_path = r"C:\Program Files\MetaTrader 5\terminal64.exe"
        
        # Retry initialization with exponential backoff (IPC timeout fix)
        max_retries = 3
        initialized = False
        
        for attempt in range(max_retries):
            print(f"MT5 initialization attempt {attempt + 1}/{max_retries}...")
            initialized = mt5.initialize(path=generic_mt5_path)
            if initialized:
                print("✅ MT5 initialized successfully")
                break
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt  # Exponential backoff: 1s, 2s, 4s
                print(f"⏳ Waiting {wait_time} seconds before retry...")
                time.sleep(wait_time)
        
        if not initialized:
            last_error = mt5.last_error()
            return {
                "connected": False,
                "error": f"MT5 initialization failed after {max_retries} attempts: {last_error}. Generic MT5 must be running and fully initialized at '{generic_mt5_path}'. Try: 1) Restart Generic MT5, 2) Log in manually once, 3) Keep terminal open. Do NOT use EC Markets MT5 as it's reserved for live price feeds."
            }
        
        initialized_by_us = True
        
        # Login with detailed error handling
        print(f"Attempting MT5 login...")
        print(f"  Login ID: {login}")
        print(f"  Server: {server}")
        print(f"  Password: {'***' + password[-2:] if password and len(password) > 2 else '***'}")
        
        # Convert login to integer (MT5 requires integer login IDs)
        try:
            login_int = int(login)
        except (ValueError, TypeError):
            if initialized_by_us:
                mt5.shutdown()
            return {
                "connected": False,
                "error": f"Invalid login ID format: '{login}'. Login ID must be a number."
            }
        
        # Set timeout for login (30 seconds max)
        print(f"Calling mt5.login() - this may take 10-30 seconds if MT5 is initializing...")
        start_time = time.time()
        authorized = mt5.login(login_int, password=password, server=server)
        elapsed = time.time() - start_time
        print(f"Login attempt completed in {elapsed:.2f} seconds")
        
        if not authorized:
            error = mt5.last_error()
            error_code = error[0] if isinstance(error, tuple) else None
            error_msg = error[1] if isinstance(error, tuple) else str(error)
            
            print(f"Login failed. Error code: {error_code}, Message: {error_msg}")
            
            # Provide more helpful error messages
            if error_code == 10004:  # TRADE_RETCODE_INVALID_ACCOUNT
                error_message = f"Invalid account. Login ID {login} not found on server '{server}'. Please verify your Login ID and Server name match your MT5 account exactly."
            elif error_code == 10003:  # TRADE_RETCODE_INVALID_PASSWORD
                error_message = f"Invalid password for login {login} on server '{server}'. Please verify your password is correct."
            elif 'invalid' in error_msg.lower() or 'failed' in error_msg.lower():
                error_message = f"Login failed: {error_msg}. Please verify your Login ID ({login}), Password, and Server name ('{server}') match your MT5 account exactly. Server names are case-sensitive."
            else:
                error_message = f"Login failed: {error_msg}. Please verify your credentials are correct."
            
            if initialized_by_us:
                mt5.shutdown()
            return {
                "connected": False,
                "error": error_message,
                "error_code": error_code,
                "error_details": error_msg
            }
        
        # Get account info
        account_info = mt5.account_info()
        
        if account_info is None:
            if initialized_by_us:
                mt5.shutdown()
            return {
                "connected": False,
                "error": "Failed to get account info"
            }
        
        result = {
            "connected": True,
            "account_info": {
                "login": account_info.login,
                "name": account_info.name,
                "server": account_info.server,
                "balance": account_info.balance,
                "equity": account_info.equity,
                "currency": account_info.currency,
                "leverage": account_info.leverage
            }
        }
        
        if initialized_by_us:
            mt5.shutdown()
        return result
        
    except Exception as e:
        if initialized_by_us:
            try:
                mt5.shutdown()
            except:
                pass
        return {
            "connected": False,
            "error": str(e)
        }

if __name__ == "__main__":
    # Get credentials from command line
    credentials = json.loads(sys.argv[1])
    
    result = test_connection(
        credentials["login"],
        credentials["password"],
        credentials["server"]
    )
    
    print(json.dumps(result))
'@

Set-Content -Path $filePath -Value $content -Encoding UTF8
Write-Host "✅ File updated: $filePath" -ForegroundColor Green


