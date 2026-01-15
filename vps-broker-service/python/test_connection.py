#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test MT5 Connection
Tests login to MT5 broker and returns account info
"""

import sys
import json
import os
# Add current directory to Python path (needed for Wine)
if os.path.dirname(__file__):
    sys.path.insert(0, os.path.dirname(__file__))
import MetaTrader5 as mt5
import signal
import time
import io
from mt5_error_handler import get_last_error, get_error_message, check_error, format_error_response

# Fix Windows console encoding issues
if sys.platform == 'win32':
    import codecs
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Redirect all print statements to stderr so stdout only contains JSON
# This allows Node.js to parse the JSON output correctly
def print_debug(*args, **kwargs):
    """Print to stderr instead of stdout for debugging"""
    print(*args, file=sys.stderr, **kwargs)

def test_connection(login, password, server, terminal_id=None, terminal_path=None, terminal_data_path=None, portable_mode=False):
    """Test MT5 connection and return account info
    
    Args:
        login: MT5 account login ID
        password: MT5 account password
        server: MT5 server name
        terminal_id: Terminal instance ID (for multi-terminal support)
        terminal_path: Path to terminal executable (for portable mode)
        terminal_data_path: Path to terminal data directory (for portable mode)
        portable_mode: Whether to use portable mode (isolated terminal instance)
    
    CRITICAL: Uses ONLY Generic MT5 (NOT EC Markets MT5) to avoid interfering with price feeder
    """
    initialized_by_us = False
    already_connected = False
    try:
        # Determine terminal path
        # On Ubuntu VPS, use the correct MT5 path: /root/imperial-factory/mt5-master/terminal64.exe
        # CRITICAL: Use exact path to avoid Wine search issues
        import os
        
        if portable_mode and terminal_path:
            # Use assigned terminal instance in portable mode (if provided)
            generic_mt5_path = terminal_path
            print_debug(f"Using portable mode terminal {terminal_id} at: {generic_mt5_path}")
            print_debug(f"Terminal data path: {terminal_data_path}")
        else:
            # CRITICAL: Use Windows-style paths (C:\...) for Wine, not Linux paths (/root/...)
            # Wine maps /root/.wine/drive_c/ to C:\
            # Check if symlink exists: /root/.wine/drive_c/imperial-factory -> /root/imperial-factory
            generic_mt5_path = None
            
            if os.path.exists('/root/.wine/drive_c/imperial-factory/mt5-master/terminal64.exe'):
                # Use Windows path format for Wine
                generic_mt5_path = 'C:\\imperial-factory\\mt5-master\\terminal64.exe'
                print_debug(f"✅ Found MT5 at Wine path: {generic_mt5_path} (linked from /root/imperial-factory)")
            elif os.path.exists('/root/.wine/drive_c/Program Files/MetaTrader 5/terminal64.exe'):
                # Use Windows path format for Wine
                generic_mt5_path = 'C:\\Program Files\\MetaTrader 5\\terminal64.exe'
                print_debug(f"✅ Found MT5 at default Wine path: {generic_mt5_path}")
            elif os.path.exists('/root/imperial-factory/mt5-master/terminal64.exe'):
                # Fallback: Linux path (will try to convert, but may fail)
                print_debug("⚠️  WARNING: Using Linux path - may cause IPC timeout. Consider creating symlink to Wine drive_c")
                generic_mt5_path = '/root/imperial-factory/mt5-master/terminal64.exe'
            else:
                # Last resort: let Python library auto-detect (may cause Wine errors)
                generic_mt5_path = None
                print_debug("⚠️  MT5 path not found in known locations, using auto-detection (may fail)")
        
        # Convert login to integer (MT5 requires integer login IDs)
        try:
            login_int = int(login)
        except (ValueError, TypeError):
            return {
                "connected": False,
                "error": f"Invalid login ID format: '{login}'. Login ID must be a number."
            }
        
        # CRITICAL: Check if MT5 is already initialized and logged in to the same account
        # This preserves the "Save password" setting in MT5
        print_debug(f"Checking if MT5 is already connected to account {login_int} on server {server}...")
        
        start_time = time.time()
        
        # First, try to initialize without login (connects to existing terminal if available)
        # Use a shorter timeout for this check (5 seconds) to avoid hanging
        already_connected = False
        try:
            # Quick check: try to connect to existing terminal with short timeout
            if portable_mode and terminal_path and generic_mt5_path:
                # Try to connect to existing portable terminal
                # Use timeout=5000 (5 seconds) for quick check
                initialized_existing = mt5.initialize(path=generic_mt5_path, portable=True, timeout=5000)
            elif generic_mt5_path:
                # Try to connect to specified MT5 path
                # Use shorter timeout for quick check (5 seconds) and portable mode
                initialized_existing = mt5.initialize(path=generic_mt5_path, timeout=5000, portable=True)
            else:
                # Try to connect to existing default terminal with short timeout (auto-detect)
                initialized_existing = mt5.initialize(timeout=5000)
            
            if initialized_existing:
                # Check if already logged in to the correct account
                account_info = mt5.account_info()
                if account_info and account_info.login == login_int and account_info.server == server:
                    print_debug(f"✅ MT5 already connected to account {login_int} on {server} - using existing connection")
                    already_connected = True
                    initialized = True
                else:
                    # Different account or not logged in - need to login
                    print_debug(f"MT5 initialized but not logged in to account {login_int} on {server}")
                    if account_info:
                        print_debug(f"  Current account: {account_info.login} on {account_info.server}")
                    mt5.shutdown()  # Close existing connection to allow new login
                    initialized_existing = False
        except Exception as e:
            print_debug(f"Could not connect to existing MT5 terminal: {e}")
            initialized_existing = False
        
        # If not already connected, initialize and login separately (CRITICAL for Wine stability)
        # CRITICAL: Python must LAUNCH MT5 itself (not connect to existing) for Wine IPC to work
        if not already_connected:
            print_debug(f"Initializing MT5 and connecting to account {login_int} on server {server}...")
            print_debug(f"  CRITICAL: Python will LAUNCH MT5 (not connect to existing) for Wine IPC compatibility")
            print_debug(f"  Using separate initialize() + login() for Wine stability")
            print_debug(f"  Timeout: 60 seconds (60000ms) - increased for Wine IPC stability")
            
            # CRITICAL FIX: Under Wine, initialize(login=...) often fails
            # It is 100% more stable to initialize() first, then call login() separately
            # Retry initialization (without login) - reduced to 2 retries
            max_retries = 2
            initialized = False
            authorized = False
            last_error = None
            
            for attempt in range(max_retries):
                try:
                    # Step 1: Initialize ONLY (no login parameters)
                    print_debug(f"Attempt {attempt + 1}/{max_retries}: Initializing MT5 Terminal...")
                    if generic_mt5_path:
                        # Use explicit path (recommended - avoids Wine auto-detection issues)
                        print_debug(f"  Using explicit path: {generic_mt5_path}")
                        if portable_mode and terminal_data_path:
                            # Portable mode: terminal uses isolated data directory
                            # CRITICAL: Use 60 second timeout for Wine stability (IPC pipe takes longer)
                            initialized = mt5.initialize(
                                path=generic_mt5_path,
                                timeout=60000,  # 60 seconds - increased for Wine IPC stability
                                portable=True  # Enable portable mode
                            )
                        else:
                            # Standard mode: use specified MT5 path (Ubuntu VPS)
                            # CRITICAL: Use portable mode for Wine stability - MT5 should be launched with /portable flag
                            # Use 60 second timeout for Wine stability (IPC pipe takes longer)
                            initialized = mt5.initialize(
                                path=generic_mt5_path,
                                timeout=60000,  # 60 seconds - increased for Wine IPC stability
                                portable=True  # CRITICAL: Use portable mode for Wine/Ubuntu (MT5 launched with /portable flag)
                            )
                    else:
                        # Fallback: auto-detect MT5 terminal (may cause Wine errors)
                        print_debug("⚠️  WARNING: Using auto-detect (no explicit path) - may cause Wine issues")
                        # CRITICAL: Use 60 second timeout and portable mode for Wine stability
                        initialized = mt5.initialize(timeout=60000, portable=True)  # 60 seconds, portable mode
                    
                    if initialized:
                        print_debug("✅ MT5 initialized successfully")
                        
                        # Step 2: Wait for IPC pipe to settle (CRITICAL for Wine stability)
                        print_debug("Waiting for IPC pipe to settle (5 seconds)...")
                        time.sleep(5)  # Increased wait time - Wine takes longer to create the Pipe
                        
                        # Step 3: Login separately (more stable under Wine)
                        print_debug(f"Attempting login to account {login_int} on server {server}...")
                        authorized = mt5.login(login=login_int, password=password, server=server)
                        
                        if authorized:
                            print_debug(f"✅ Login successful")
                            break  # Success - exit retry loop
                        else:
                            # Login failed - get error and retry
                            last_error = mt5.last_error()
                            print_debug(f"❌ Login failed: {last_error}")
                            mt5.shutdown()  # Clean up before retry
                            initialized = False
                            if attempt < max_retries - 1:
                                print_debug(f"  Waiting 0.5s before retry...")
                                time.sleep(0.5)
                    else:
                        # Initialization failed
                        last_error = mt5.last_error()
                        print_debug(f"❌ MT5 initialization failed: {last_error}")
                        if attempt < max_retries - 1:
                            print_debug(f"  Waiting 0.5s before retry...")
                            time.sleep(0.5)
                except Exception as e:
                    last_error = str(e)
                    print_debug(f"  Attempt {attempt + 1} failed: {e}")
                    if initialized:
                        mt5.shutdown()
                        initialized = False
                    if attempt < max_retries - 1:
                        time.sleep(0.5)
            
            # Check if we successfully logged in
            if not authorized:
                if initialized:
                    mt5.shutdown()
                elapsed = time.time() - start_time
                error = get_last_error() if not last_error else (None, str(last_error))
                error_response = format_error_response(error[0] if error[0] else -1000, error[1] if error[1] else "Login failed", "MT5 login")
                error_response["error"] = f"MT5 login failed after {max_retries} attempts ({elapsed:.2f}s). {error_response['error']}"
                return {
                    "connected": False,
                    **error_response
                }
        
        elapsed = time.time() - start_time
        
        # At this point, we should be initialized and logged in (either already connected or just logged in)
        if not already_connected:
            initialized_by_us = True
        print_debug(f"✅ MT5 initialized and logged in successfully ({elapsed:.2f}s)")
        
        # Get MT5 version (per official MT5 Python API)
        # Reference: https://www.mql5.com/en/docs/python_metatrader5/mt5version_py
        mt5_version = mt5.version()
        if mt5_version:
            version_major, build, release_date = mt5_version
            print_debug(f"MT5 Version: {version_major}, Build: {build}, Release: {release_date}")
        else:
            # Check for errors when getting version
            has_error, error_code, error_msg = check_error("get MT5 version")
            if has_error:
                print_debug(f"WARNING: Could not get MT5 version: {error_msg}")
            else:
                print_debug("WARNING: Could not get MT5 version info")
        
        # CRITICAL: Add delay after initialization to let IPC pipe fully open
        # This prevents "IPC timeout" errors on Windows VPS
        # Increased to 2 seconds for better reliability
        print_debug("Waiting 2 seconds for MT5 IPC pipe to fully initialize...")
        time.sleep(2)
        
        # CRITICAL: Wait for terminal to sync with broker server (like fetch_trades.py)
        # This ensures MT5 is fully ready before attempting operations
        print_debug("Waiting for terminal to sync with broker server...")
        try:
            # Wait up to 3 seconds for terminal sync (reduced from 5s for speed)
            sync_result = mt5.wait_for_terminal_sync(timeout=3000)
            if sync_result:
                print_debug("✅ Terminal synced successfully")
            else:
                print_debug("⚠️  Terminal sync timeout, but continuing anyway...")
                time.sleep(0.5)  # Reduced fallback wait (from 2s)
        except Exception as e:
            print_debug(f"⚠️  Terminal sync check failed: {e}, waiting 0.5s as fallback...")
            time.sleep(0.5)  # Reduced fallback wait (from 2s)
        
        # Verify MT5 is actually ready using terminal_info() (per official MT5 Python API)
        # Reference: https://www.mql5.com/en/docs/python_metatrader5/mt5terminalinfo_py
        terminal_info = mt5.terminal_info()
        if not terminal_info:
            if initialized_by_us and not already_connected:
                mt5.shutdown()
            return {
                "connected": False,
                "error": "MT5 terminal_info() returned None. This usually means: 1) MT5 is not fully initialized, 2) Permission issue (run as Administrator), 3) Ghost MT5 process running. Try: Close all MT5 windows, kill terminal64.exe processes, restart MT5 as Administrator."
            }
        
        # Display comprehensive terminal info (per official API documentation)
        print_debug(f"MT5 Terminal Info:")
        print_debug(f"  Name: {terminal_info.name}")
        print_debug(f"  Company: {terminal_info.company}")
        print_debug(f"  Build: {terminal_info.build}")
        print_debug(f"  Path: {terminal_info.path}")
        print_debug(f"  Connected: {terminal_info.connected}")
        print_debug(f"  Trade Allowed: {terminal_info.trade_allowed}")
        print_debug(f"  DLLs Allowed: {terminal_info.dlls_allowed}")
        
        # Verify terminal is connected
        if not terminal_info.connected:
            if initialized_by_us and not already_connected:
                mt5.shutdown()
            return {
                "connected": False,
                "error": f"MT5 terminal is not connected. Terminal status: connected={terminal_info.connected}. Please verify MT5 is running and accessible."
            }
        
        # Check if algorithmic trading is enabled (CRITICAL for trade fetching)
        if not terminal_info.trade_allowed:
            print_debug("⚠️  WARNING: Algorithmic Trading is NOT enabled in MT5 terminal")
            print_debug("   This will cause issues with trade fetching and API operations.")
            print_debug("   Please enable it in: Tools -> Options -> Expert Advisors -> Allow Algorithmic Trading")
            print_debug("   Or run: C:\\vps-broker-service\\ENABLE_ALGORITHMIC_TRADING_REGISTRY.ps1")
            # Note: We continue anyway as the user may have enabled it manually, but warn them
        
        # Verify we're logged into the correct account
        account_info = mt5.account_info()
        if not account_info:
            if initialized_by_us and not already_connected:
                mt5.shutdown()
            return {
                "connected": False,
                "error": "Failed to get account info after login"
            }
        
        # Check if we're on the correct account
        if account_info.login != login_int or account_info.server != server:
            print_debug(f"WARNING: Logged into account {account_info.login} on {account_info.server}, but expected {login_int} on {server}")
            # Continue anyway - might be a server name variation
        
        authorized = True
        
        # Get account info (already retrieved above, but get fresh copy)
        account_info = mt5.account_info()
        if account_info:
            try:
                # Enable algorithmic trading if not already enabled
                if not account_info.trade_allowed:
                    print_debug("WARNING: Algorithmic trading is disabled, attempting to enable...")
                    # Note: account_info.trade_allowed is read-only, but we can check terminal settings
                    terminal_info = mt5.terminal_info()
                    if terminal_info and not terminal_info.trade_allowed:
                        print_debug("WARNING: Cannot enable algorithmic trading programmatically.")
                        print_debug("   Please enable it manually: Tools -> Options -> Expert Advisors -> Allow Algorithmic Trading")
                    else:
                        print_debug("OK: Algorithmic trading should be enabled now")
                else:
                    print_debug("OK: Algorithmic trading is already enabled")
            except Exception as e:
                print_debug(f"WARNING: Could not check/enable algorithmic trading: {e}")
        
        if account_info is None:
            # Check for errors when getting account info
            error = get_last_error()
            if error:
                error_code, error_msg = error
                error_response = format_error_response(error_code, error_msg, "get account info")
            else:
                error_response = {
                    "error": "Failed to get account info after successful login",
                    "error_code": None,
                    "error_details": "account_info() returned None"
                }
            
            if initialized_by_us and not already_connected:
                mt5.shutdown()
            return {
                "connected": False,
                **error_response
            }
        
        # Note: MT5 Python API doesn't have set_timeout() method
        # Timeout is handled in initialize() and login() calls
        
        # Get MT5 version for response (per official API)
        mt5_version = mt5.version()
        version_info = None
        if mt5_version:
            version_major, build, release_date = mt5_version
            version_info = {
                "version": version_major,
                "build": build,
                "release_date": release_date
            }
        
        # Get comprehensive account info (per official MT5 Python API)
        # Reference: https://www.mql5.com/en/docs/python_metatrader5/mt5accountinfo_py
        # Convert to dictionary for easy access (per official API example)
        account_dict = account_info._asdict()
        
        # Display account info for diagnostics
        print_debug(f"Account Info Retrieved:")
        print_debug(f"  Login: {account_info.login}")
        print_debug(f"  Name: {account_info.name}")
        print_debug(f"  Server: {account_info.server}")
        print_debug(f"  Balance: {account_info.balance} {account_info.currency}")
        print_debug(f"  Equity: {account_info.equity} {account_info.currency}")
        print_debug(f"  Leverage: 1:{account_info.leverage}")
        print_debug(f"  Trade Allowed: {account_info.trade_allowed}")
        print_debug(f"  Trade Expert: {account_info.trade_expert}")
        
        # Return comprehensive account info (per official API)
        result = {
            "connected": True,
            "mt5_version": version_info,  # Include MT5 version info
            "account_info": {
                # Basic account info
                "login": account_info.login,
                "name": account_info.name,
                "server": account_info.server,
                "company": account_info.company,
                "currency": account_info.currency,
                
                # Trading settings
                "leverage": account_info.leverage,
                "trade_mode": account_info.trade_mode,
                "margin_mode": account_info.margin_mode,
                "trade_allowed": account_info.trade_allowed,
                "trade_expert": account_info.trade_expert,
                "fifo_close": account_info.fifo_close,
                
                # Account balance info
                "balance": account_info.balance,
                "equity": account_info.equity,
                "profit": account_info.profit,
                "credit": account_info.credit,
                "margin": account_info.margin,
                "margin_free": account_info.margin_free,
                "margin_level": account_info.margin_level,
                
                # Additional info
                "limit_orders": account_info.limit_orders,
                "currency_digits": account_info.currency_digits
            },
            "server_used": account_info.server,  # Use actual server from account_info
            "connection_time_ms": int(elapsed * 1000)  # Convert to milliseconds
        }
        
        # CRITICAL: Only shutdown if we initialized the connection ourselves
        # If we reused an existing connection (already_connected=True), don't shutdown
        # This preserves the MT5 connection and "Save password" setting
        if initialized_by_us and not already_connected:
            print_debug("Shutting down MT5 connection (we initialized it)")
            mt5.shutdown()
        else:
            print_debug("Keeping MT5 connection alive (reused existing connection)")
        return result
        
    except Exception as e:
        # Check for MT5 errors even in exception handler
        error = get_last_error()
        error_response = {
            "connected": False,
            "error": str(e),
            "error_type": "Python exception"
        }
        
        if error:
            error_code, error_msg = error
            error_response.update(format_error_response(error_code, error_msg, "exception handler"))
            error_response["error"] = f"{str(e)}. MT5 error: {error_response.get('error', error_msg)}"
        
        if initialized_by_us:
            try:
                mt5.shutdown()
            except:
                pass
        
        return error_response

if __name__ == "__main__":
    # Get credentials from command line
    credentials = json.loads(sys.argv[1])
    
    result = test_connection(
        credentials["login"],
        credentials["password"],
        credentials["server"],
        terminal_id=credentials.get("terminal_id"),
        terminal_path=credentials.get("terminal_path"),
        terminal_data_path=credentials.get("terminal_data_path"),
        portable_mode=credentials.get("portable_mode", False)
    )
    
    # CRITICAL: Output JSON to stdout (not stderr) so Node.js can parse it
    print(json.dumps(result))


