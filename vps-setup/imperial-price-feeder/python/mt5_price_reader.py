#!/usr/bin/env python3
"""
MT5 Price Reader - Uses broker service bridge pattern
Connects to EC Markets MT5 (standard installation) and fetches prices
Outputs JSON to stdout for Price Feeder to consume (broker service pattern)
"""

import sys
import json
import time
import platform
from datetime import datetime

try:
    import MetaTrader5 as mt5
except ImportError:
    print(json.dumps({"error": "MetaTrader5 module not installed. Run: pip install MetaTrader5"}), file=sys.stderr)
    sys.exit(1)

# EC Markets MT5 (standard installation) - same as broker service pattern
EC_MARKETS_MT5_PATH = r"C:\Program Files\EC Markets MetaTrader 5\terminal64.exe"

# Symbols to fetch
SYMBOLS = ['XAUUSD', 'BTCUSD', 'U30USD', 'SPXUSD', 'NDXUSD']

def normalize_symbol(symbol):
    """Normalize symbol names"""
    symbol_map = {
        'GOLD': 'XAUUSD',
        'GOLD/USD': 'XAUUSD',
        'XAU/USD': 'XAUUSD',
        'BTC/USD': 'BTCUSD',
        'US30': 'U30USD',
        'SPX500': 'SPXUSD',
        'NAS100': 'NDXUSD'
    }
    return symbol_map.get(symbol.upper(), symbol.upper())

def get_price_from_mt5(symbol):
    """Get current price from MT5 for a symbol"""
    try:
        tick = mt5.symbol_info_tick(symbol)
        
        if tick is None:
            normalized = normalize_symbol(symbol)
            if normalized != symbol:
                tick = mt5.symbol_info_tick(normalized)
        
        if tick is None or tick.bid == 0:
            return None
        
        mid = (tick.bid + tick.ask) / 2
        
        return {
            'symbol': normalize_symbol(symbol),
            'bid': float(tick.bid),
            'ask': float(tick.ask),
            'mid': float(mid),
            'price': float(mid),
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        }
    except Exception as e:
        print(f"Error getting price for {symbol}: {e}", file=sys.stderr)
        return None

def initialize_mt5_with_broker_service_pattern():
    """
    Initialize MT5 using broker service pattern:
    1. Check if already connected (reuse existing connection)
    2. Try EC Markets MT5 standard installation
    3. Fallback to simple initialize() if terminal already running
    """
    initialized_by_us = False
    already_connected = False
    
    try:
        # Strategy 1: Check if MT5 is already initialized (reuse connection)
        # This is the broker service pattern - preserves "Save password" setting
        try:
            initialized_existing = mt5.initialize(timeout=5000)
            if initialized_existing:
                account_info = mt5.account_info()
                if account_info and account_info.server and 'ECMarkets' in account_info.server:
                    # Already connected to EC Markets - reuse it!
                    terminal_info = mt5.terminal_info()
                    if terminal_info and terminal_info.connected:
                        print("✅ Reusing existing EC Markets MT5 connection", file=sys.stderr)
                        sys.stderr.flush()
                        return True
                # Different broker or not logged in - close and reconnect
                mt5.shutdown()
                time.sleep(1)
        except Exception as e:
            pass  # No existing connection
        
        # Strategy 2: Connect to EC Markets MT5 (standard installation)
        # Use same pattern as broker service but point to EC Markets
        print(f"Connecting to EC Markets MT5 at: {EC_MARKETS_MT5_PATH}", file=sys.stderr)
        sys.stderr.flush()
        
        initialized = mt5.initialize(path=EC_MARKETS_MT5_PATH, timeout=10000)
        
        if initialized:
            # Verify connection is actually working
            time.sleep(1)  # Let IPC establish
            terminal_info = mt5.terminal_info()
            if terminal_info and terminal_info.connected:
                account_info = mt5.account_info()
                if account_info:
                    print(f"✅ Connected to EC Markets MT5 - Account: {account_info.login}, Server: {account_info.server}", file=sys.stderr)
                    sys.stderr.flush()
                    initialized_by_us = True
                    return True
                else:
                    print("⚠️  MT5 initialized but not logged in", file=sys.stderr)
                    sys.stderr.flush()
                    mt5.shutdown()
            else:
                mt5.shutdown()
        
        # Strategy 3: Simple initialize() - hooks into existing terminal
        if not initialized:
            initialized = mt5.initialize(timeout=10000)
            if initialized:
                time.sleep(1)
                terminal_info = mt5.terminal_info()
                if terminal_info and terminal_info.connected:
                    account_info = mt5.account_info()
                    if account_info and 'ECMarkets' in account_info.server:
                        print(f"✅ Connected via simple initialize() - Account: {account_info.login}", file=sys.stderr)
                        sys.stderr.flush()
                        initialized_by_us = True
                        return True
                    else:
                        mt5.shutdown()
        
        # All strategies failed
        error = mt5.last_error()
        error_code = error[0] if error else -1
        error_desc = error[1] if error else "Unknown error"
        
        print(json.dumps({
            "error": f"MT5 initialization failed: {error_desc}",
            "code": error_code,
            "description": error_desc,
            "mt5_path": EC_MARKETS_MT5_PATH
        }), file=sys.stderr)
        sys.stderr.flush()
        
        return False
        
    except Exception as e:
        print(json.dumps({
            "error": f"MT5 initialization exception: {str(e)}",
            "code": -1
        }), file=sys.stderr)
        sys.stderr.flush()
        return False

def main():
    """Main function - fetches prices and outputs JSON (broker service pattern)"""
    # Initialize MT5 using broker service pattern
    if not initialize_mt5_with_broker_service_pattern():
        sys.exit(1)
    
    # Verify account info to ensure terminal is logged in
    account_info = mt5.account_info()
    if account_info is None:
        error = mt5.last_error()
        print(json.dumps({
            "error": "Failed to get account info. MT5 terminal may not be logged in.",
            "code": error[0] if error else -1,
            "description": error[1] if error else "Account info unavailable",
            "hint": "Ensure EC Markets MT5 terminal (standard installation) is open, logged in, and shows 'Connected' status"
        }), file=sys.stderr)
        sys.stderr.flush()
        mt5.shutdown()
        sys.exit(1)
    
    # Collect prices for all symbols
    prices = []
    for symbol in SYMBOLS:
        price_data = get_price_from_mt5(symbol)
        if price_data:
            prices.append(price_data)
    
    # Output JSON to stdout (broker service pattern)
    result = json.dumps({
        'prices': prices,
        'status': 'success',
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'count': len(prices)
    })
    
    print(result)
    sys.stdout.flush()
    
    # Don't shutdown - let connection persist for next call (broker service pattern)
    # mt5.shutdown()  # Commented out to reuse connection (same as broker service)

if __name__ == '__main__':
    main()
