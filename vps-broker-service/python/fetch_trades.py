#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Fetch MT5 Trades
Fetches all closed trades from MT5 broker
"""

import sys
import json
import os
# Add current directory to Python path (needed for Wine)
if os.path.dirname(__file__):
    sys.path.insert(0, os.path.dirname(__file__))
import MetaTrader5 as mt5
from datetime import datetime, timedelta
import time
import io
from mt5_error_handler import get_last_error, get_error_message, check_error, format_error_response

# Fix Windows console encoding issues
if sys.platform == 'win32':
    import codecs
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def fetch_trades(login, password, server, terminal_id=None, terminal_path=None, terminal_data_path=None, portable_mode=False):
    """Fetch all closed trades from MT5
    
    Args:
        login: MT5 account login ID
        password: MT5 account password
        server: MT5 server name
        terminal_id: Terminal instance ID (for multi-terminal support)
        terminal_path: Path to terminal executable (for portable mode)
        terminal_data_path: Path to terminal data directory (for portable mode)
        portable_mode: Whether to use portable mode (isolated terminal instance)
    
    IMPORTANT: This uses the Generic MT5 terminal (not EC Markets MT5)
    - EC Markets MT5 is reserved for live price feeds only
    - Generic MT5 is used for auto-sync journal connections
    - Python MT5 library connects to Generic MT5 at: C:\Program Files\MetaTrader 5\terminal64.exe
    """
    initialized_by_us = False
    try:
        # Determine terminal path
        # On Ubuntu VPS, use the correct MT5 path: /root/imperial-factory/mt5-master/terminal64.exe
        if portable_mode and terminal_path:
            # Use assigned terminal instance in portable mode (if provided)
            generic_mt5_path = terminal_path
            print(f"Using portable mode terminal {terminal_id} at: {generic_mt5_path}")
            print(f"Terminal data path: {terminal_data_path}")
        else:
            # CRITICAL: Use Windows-style paths (C:\...) for Wine, not Linux paths (/root/...)
            # Wine maps /root/.wine/drive_c/ to C:\
            import os
            generic_mt5_path = None
            
            if os.path.exists('/root/.wine/drive_c/imperial-factory/mt5-master/terminal64.exe'):
                # Use Windows path format for Wine
                generic_mt5_path = 'C:\\imperial-factory\\mt5-master\\terminal64.exe'
                print(f"✅ Found MT5 at Wine path: {generic_mt5_path} (linked from /root/imperial-factory)")
            elif os.path.exists('/root/.wine/drive_c/Program Files/MetaTrader 5/terminal64.exe'):
                # Use Windows path format for Wine
                generic_mt5_path = 'C:\\Program Files\\MetaTrader 5\\terminal64.exe'
                print(f"✅ Found MT5 at default Wine path: {generic_mt5_path}")
            elif os.path.exists('/root/imperial-factory/mt5-master/terminal64.exe'):
                # Fallback: Linux path (will try to convert, but may fail)
                print("⚠️  WARNING: Using Linux path - may cause IPC timeout. Consider creating symlink to Wine drive_c")
                generic_mt5_path = '/root/imperial-factory/mt5-master/terminal64.exe'
            else:
                # Fallback: let Python library auto-detect
                generic_mt5_path = None
                print("MT5 path not found, using auto-detection")
        
        # Convert login to integer (MT5 requires integer login IDs)
        try:
            login_int = int(login)
        except (ValueError, TypeError):
            return {
                "trades": [],
                "account_balance": 0,
                "error": f"Invalid login ID format: '{login}'. Login ID must be a number."
            }
        
        # CRITICAL: Check if MT5 is already initialized and logged in to the same account
        # This preserves the "Save password" setting in MT5
        print(f"Checking if MT5 is already connected to account {login_int} on server {server}...")
        
        # First, try to initialize without login (connects to existing terminal if available)
        already_connected = False
        try:
            if portable_mode and terminal_path and generic_mt5_path:
                # Try to connect to existing portable terminal
                initialized_existing = mt5.initialize(path=generic_mt5_path, portable=True)
            elif generic_mt5_path:
                # Try to connect to specified MT5 path
                initialized_existing = mt5.initialize(path=generic_mt5_path)
            else:
                # Try to connect to existing default terminal (auto-detect)
                initialized_existing = mt5.initialize()
            
            if initialized_existing:
                # Check if already logged in to the correct account
                account_info = mt5.account_info()
                if account_info and account_info.login == login_int and account_info.server == server:
                    print(f"✅ MT5 already connected to account {login_int} on {server} - using existing connection")
                    already_connected = True
                    initialized = True
                else:
                    # Different account or not logged in - need to login
                    print(f"MT5 initialized but not logged in to account {login_int} on {server}")
                    if account_info:
                        print(f"  Current account: {account_info.login} on {account_info.server}")
                    mt5.shutdown()  # Close existing connection to allow new login
                    initialized_existing = False
        except Exception as e:
            print(f"Could not connect to existing MT5 terminal: {e}")
            initialized_existing = False
        
        # If not already connected, initialize with login credentials
        if not already_connected:
            print(f"Initializing MT5 and connecting to account {login_int} on server {server}...")
            print(f"  Using official MT5 Python API: initialize() with login parameters")
            print(f"  Timeout: 30 seconds (30000ms)")
            
            # Retry initialization with login credentials (exponential backoff)
            max_retries = 3
            initialized = False
            last_error = None
            
            for attempt in range(max_retries):
                try:
                    # If portable_mode is True, the terminal will use the data_path for isolated storage
                    if portable_mode and terminal_data_path and generic_mt5_path:
                        # Portable mode: terminal uses isolated data directory
                        initialized = mt5.initialize(
                            path=generic_mt5_path,
                            login=login_int,
                            password=password,
                            server=server,
                            timeout=30000,  # 30 seconds in milliseconds
                            portable=True  # Enable portable mode
                        )
                    elif generic_mt5_path:
                        # Standard mode: use specified MT5 path (Ubuntu VPS)
                        initialized = mt5.initialize(
                            path=generic_mt5_path,
                            login=login_int,
                            password=password,
                            server=server,
                            timeout=30000  # 30 seconds in milliseconds
                        )
                    else:
                        # Fallback: auto-detect MT5 terminal
                        initialized = mt5.initialize(
                            login=login_int,
                            password=password,
                            server=server,
                            timeout=30000  # 30 seconds in milliseconds
                        )
                    if initialized:
                        break
                except Exception as e:
                    last_error = str(e)
                    print(f"  Initialize attempt {attempt + 1} failed: {e}")
                    if attempt < max_retries - 1:
                        wait_time = 2 ** attempt  # Exponential backoff: 1s, 2s, 4s
                        time.sleep(wait_time)
        
        if not initialized:
            # Use comprehensive error handling (per official MT5 Python API)
            error = get_last_error()
            if error:
                error_code, error_msg = error
                error_response = format_error_response(error_code, error_msg, "MT5 initialization/login")
                error_response["error"] = f"MT5 initialization/login failed after {max_retries} attempts: {error_response['error']} MT5 terminal must be running. Try: 1) Ensure MT5 is installed and running, 2) Check if MT5 process is active."
                return {
                    "trades": [],
                    "account_balance": 0,
                    **error_response
                }
            else:
                return {
                    "trades": [],
                    "account_balance": 0,
                    "error": f"MT5 initialization/login failed after {max_retries} attempts. MT5 terminal must be running."
                }
        
        # Mark that we successfully initialized, so we can safely shutdown later
        # BUT only if we didn't reuse an existing connection
        if not already_connected:
            initialized_by_us = True
        
        # Get MT5 version (per official MT5 Python API)
        # Reference: https://www.mql5.com/en/docs/python_metatrader5/mt5version_py
        mt5_version = mt5.version()
        if mt5_version:
            version_major, build, release_date = mt5_version
            print(f"MT5 Version: {version_major}, Build: {build}, Release: {release_date}")
        
        # Wait for IPC pipe to fully open (Windows-specific)
        # Increased to 2 seconds for better reliability
        print("Waiting 2 seconds for MT5 IPC pipe to fully initialize...")
        time.sleep(2)
        
        # CRITICAL: Wait for terminal to sync with broker server
        # This ensures history data is fully downloaded before fetching trades
        # Reference: https://www.mql5.com/en/docs/python_metatrader5/mt5waitforterminalsync_py
        print("Waiting for terminal to sync with broker server...")
        try:
            # Wait up to 5 seconds for terminal sync
            sync_result = mt5.wait_for_terminal_sync(timeout=5000)
            if sync_result:
                print("✅ Terminal synced successfully")
            else:
                print("⚠️  Terminal sync timeout, but continuing anyway...")
                # Wait an additional 1-2 seconds as fallback
                time.sleep(2)
        except Exception as e:
            print(f"⚠️  Terminal sync check failed: {e}, waiting 2 seconds as fallback...")
            time.sleep(2)  # Fallback: wait 2 seconds for history to sync
        
        # Verify terminal is ready using terminal_info() (per official MT5 Python API)
        # Reference: https://www.mql5.com/en/docs/python_metatrader5/mt5terminalinfo_py
        terminal_info = mt5.terminal_info()
        if not terminal_info:
            if initialized_by_us and not already_connected:
                mt5.shutdown()
            return {
                "trades": [],
                "account_balance": 0,
                "error": "MT5 terminal_info() returned None. Terminal not ready."
            }
        
        # Verify terminal is connected
        if not terminal_info.connected:
            if initialized_by_us and not already_connected:
                mt5.shutdown()
            return {
                "trades": [],
                "account_balance": 0,
                "error": f"MT5 terminal is not connected. Terminal status: connected={terminal_info.connected}"
            }
        
        # Check if algorithmic trading is enabled (CRITICAL for trade fetching)
        if not terminal_info.trade_allowed:
            print("⚠️  WARNING: Algorithmic Trading is NOT enabled in MT5 terminal")
            print("   This will cause issues with trade fetching.")
            print("   Please enable it in: Tools -> Options -> Expert Advisors -> Allow Algorithmic Trading")
            # Note: We continue anyway, but trades may not be fetchable
        
        # Get comprehensive account info (per official MT5 Python API)
        # Reference: https://www.mql5.com/en/docs/python_metatrader5/mt5accountinfo_py
        account_info = mt5.account_info()
        if not account_info:
            # Check for errors when getting account info
            error = get_last_error()
            if error:
                error_code, error_msg = error
                error_response = format_error_response(error_code, error_msg, "get account info")
            else:
                error_response = {
                    "error": "Failed to get account info",
                    "error_code": None,
                    "error_details": "account_info() returned None"
                }
            
            if initialized_by_us and not already_connected:
                mt5.shutdown()
            return {
                "trades": [],
                "account_balance": 0,
                **error_response
            }
        
        # Extract account balance and other info
        account_balance = account_info.balance
        account_equity = account_info.equity
        account_currency = account_info.currency
        account_server = account_info.server
        
        print(f"Account Info: Login={account_info.login}, Server={account_server}, Balance={account_balance} {account_currency}, Equity={account_equity} {account_currency}")
        
        # Fetch closed deals (trades)
        # OPTIMIZATION: Use batch sync - fetch only last 24 hours to reduce load on MT5 terminal
        # This allows 1,000 users to hit Supabase while only 1 script hits MT5
        from_date = datetime.now() - timedelta(days=1)  # Last 24 hours (optimized from 90 days)
        to_date = datetime.now()
        
        print(f"Fetching deals from {from_date} to {to_date} (last 24 hours - batch sync optimization)")
        deals = mt5.history_deals_get(from_date, to_date)
        
        if deals is None:
            # Check for errors when fetching deals
            error = get_last_error()
            if error:
                error_code, error_msg = error
                error_response = format_error_response(error_code, error_msg, "fetch deals")
                print(f"Error fetching deals: {error_response['error']}")
                return {
                    "trades": [],
                    "account_balance": account_balance,
                    **error_response
                }
            else:
                print("No deals found in history")
                return {
                    "trades": [],
                    "account_balance": account_balance,
                    "error": "No deals found in history",
                    "error_code": None
                }
        
        print(f"Found {len(deals)} total deals")
        
        # Transform deals to trades format
        trades = []
        processed_tickets = set()
        
        for deal in deals:
            # Only process position-closing deals (entry deals are handled separately)
            if deal.entry == mt5.DEAL_ENTRY_OUT:
                ticket = deal.position_id
                
                # Skip if already processed
                if ticket in processed_tickets:
                    continue
                
                processed_tickets.add(ticket)
                
                # Get entry deal for this position
                entry_deals = mt5.history_deals_get(position=ticket)
                entry_deal = None
                if entry_deals:
                    for d in entry_deals:
                        if d.entry == mt5.DEAL_ENTRY_IN:
                            entry_deal = d
                            break
                
                if not entry_deal:
                    continue
                
                # Calculate trade details
                trade = {
                    "ticket": ticket,
                    "symbol": deal.symbol,
                    "type": 0 if entry_deal.type == mt5.DEAL_TYPE_BUY else 1,
                    "volume": deal.volume,
                    "price_open": entry_deal.price,
                    "price_current": deal.price,
                    "price_close": deal.price,
                    "sl": 0,  # MT5 doesn't store SL/TP in deals, would need to check orders
                    "tp": 0,
                    "profit": deal.profit,
                    "swap": deal.swap,
                    "commission": deal.commission,
                    "time": int(entry_deal.time),
                    "time_close": int(deal.time),
                    "comment": deal.comment
                }
                
                trades.append(trade)
        
        print(f"Processed {len(trades)} closed trades from {len(deals)} deals")
        
        # Return comprehensive account info along with trades (per official API)
        return {
            "trades": trades,
            "account_info": {
                "login": account_info.login,
                "server": account_server,
                "balance": account_balance,
                "equity": account_equity,
                "currency": account_currency,
                "profit": account_info.profit,
                "margin": account_info.margin,
                "margin_free": account_info.margin_free,
                "margin_level": account_info.margin_level
            },
            "account_balance": account_balance  # Keep for backward compatibility
        }
    except Exception as e:
        # Check for MT5 errors even in exception handler
        error = get_last_error()
        error_response = {
            "trades": [],
            "account_balance": 0,
            "error": str(e),
            "error_type": "Python exception"
        }
        
        if error:
            error_code, error_msg = error
            error_response.update(format_error_response(error_code, error_msg, "exception handler"))
            error_response["error"] = f"{str(e)}. MT5 error: {error_response.get('error', error_msg)}"
        
        return error_response
    finally:
        # CRITICAL: Only shutdown if WE initialized the connection
        # This prevents closing EC Markets MT5 connection used by price feeder
        if initialized_by_us:
            try:
                mt5.shutdown()
            except:
                pass  # Ignore shutdown errors

if __name__ == "__main__":
    try:
        # Get credentials from command line
        if len(sys.argv) < 2:
            error_result = {
                "trades": [],
                "account_balance": 0,
                "error": "No credentials provided"
            }
            print(json.dumps(error_result))
            sys.exit(1)
        
        credentials = json.loads(sys.argv[1])
        
        result = fetch_trades(
            credentials["login"],
            credentials["password"],
            credentials["server"],
            terminal_id=credentials.get("terminal_id"),
            terminal_path=credentials.get("terminal_path"),
            terminal_data_path=credentials.get("terminal_data_path"),
            portable_mode=credentials.get("portable_mode", False)
        )
        
        print(json.dumps(result))
    except json.JSONDecodeError as e:
        error_result = {
            "trades": [],
            "account_balance": 0,
            "error": f"JSON decode error: {str(e)}"
        }
        print(json.dumps(error_result))
        sys.exit(1)
    except Exception as e:
        error_result = {
            "trades": [],
            "account_balance": 0,
            "error": f"Script error: {str(e)}"
        }
        print(json.dumps(error_result))
        sys.exit(1)


