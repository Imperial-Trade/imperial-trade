#!/usr/bin/env python3
"""
MT5 Price Streamer - Long-running process that maintains MT5 connection
Writes prices to JSON file for Node.js Price Feeder to read
This solves Windows Session Isolation by running in Session 1 (interactive)
"""

import sys
import json
import os
import time
import platform
from datetime import datetime
from pathlib import Path

try:
    import MetaTrader5 as mt5
except ImportError:
    print(json.dumps({"error": "MetaTrader5 module not installed. Run: pip install MetaTrader5"}), file=sys.stderr)
    sys.exit(1)

# Configuration - ONLY these 5 symbols: BTCUSD, XAUUSD, US30 (U30USD), SPX (SPXUSD), NAS100 (NDXUSD)
SYMBOLS = ['XAUUSD', 'BTCUSD', 'U30USD', 'SPXUSD', 'NDXUSD']
OUTPUT_FILE = r"C:\imperial-price-feeder\prices.json"
UPDATE_INTERVAL = 0.5  # Update every 0.5 seconds (2 prices per second)
MT5_STANDARD_PATH = r"C:\Program Files\EC Markets MetaTrader 5\terminal64.exe"

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
        # Try direct symbol
        tick = mt5.symbol_info_tick(symbol)
        
        if tick is None:
            # Try normalized symbol
            normalized = normalize_symbol(symbol)
            if normalized != symbol:
                tick = mt5.symbol_info_tick(normalized)
        
        if tick is None:
            # Try common variations
            variations = [
                symbol.replace('/', ''),
                symbol.replace('USD', ''),
                f"{symbol.replace('/', '')}USD"
            ]
            for variation in variations:
                tick = mt5.symbol_info_tick(variation)
                if tick:
                    break
        
        if tick is None or tick.bid == 0:
            return None
        
        # Calculate mid price
        mid = (tick.bid + tick.ask) / 2
        
        return {
            'symbol': normalize_symbol(symbol),
            'bid': float(tick.bid),
            'ask': float(tick.ask),
            'mid': float(mid),
            'price': float(mid),  # Default to mid for compatibility
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        }
    except Exception as e:
        print(f"Error getting price for {symbol}: {e}", file=sys.stderr)
        return None

def initialize_mt5_with_fallback():
    """
    Initialize MT5 with multiple fallback strategies
    Prioritizes EC Markets MT5 standard installation
    """
    # Check Python architecture first
    arch = platform.architecture()
    if arch[0] == '32bit':
        print(json.dumps({
            "error": "Python architecture mismatch",
            "code": -2,
            "description": "Python is 32-bit but MT5 terminal64.exe is 64-bit. Install Python 64-bit.",
            "python_arch": arch[0],
            "mt5_arch": "64-bit"
        }), file=sys.stderr)
        sys.stderr.flush()
        return False
    
    # Strategy 1: Connect to EC Markets MT5 STANDARD INSTALLATION (not portable)
    initialized = mt5.initialize(path=MT5_STANDARD_PATH, timeout=10000)
    if initialized:
        time.sleep(2)  # Wait for IPC connection
        terminal_info = mt5.terminal_info()
        if terminal_info and terminal_info.connected:
            return True
        else:
            mt5.shutdown()
            time.sleep(1)
    
    # Strategy 2: Simple initialize() - hooks into existing terminal
    if not initialized:
        initialized = mt5.initialize()
        if initialized:
            time.sleep(2)
            terminal_info = mt5.terminal_info()
            if terminal_info and terminal_info.connected:
                return True
            else:
                mt5.shutdown()
                time.sleep(1)
    
    # Strategy 3: Fallback to portable
    if not initialized:
        initialized = mt5.initialize(
            path=r"C:\MT5_PriceFeeder\terminal64.exe",
            portable=True,
            timeout=10000
        )
        if initialized:
            time.sleep(2)
            terminal_info = mt5.terminal_info()
            if terminal_info and terminal_info.connected:
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
        "python_arch": arch[0]
    }), file=sys.stderr)
    sys.stderr.flush()
    
    return False

def write_prices_to_file(prices, status="success"):
    """Write prices to JSON file for Node.js to read"""
    try:
        output_dir = Path(OUTPUT_FILE).parent
        output_dir.mkdir(parents=True, exist_ok=True)
        
        data = {
            "status": status,
            "timestamp": datetime.utcnow().isoformat() + 'Z',
            "prices": prices,
            "count": len(prices)
        }
        
        # Write to temporary file first, then rename (atomic write)
        temp_file = OUTPUT_FILE + ".tmp"
        with open(temp_file, 'w') as f:
            json.dump(data, f, indent=2)
        
        # Atomic rename
        if os.path.exists(OUTPUT_FILE):
            os.replace(temp_file, OUTPUT_FILE)
        else:
            os.rename(temp_file, OUTPUT_FILE)
            
        return True
    except Exception as e:
        print(f"Error writing prices to file: {e}", file=sys.stderr)
        return False

def main():
    """Main loop - maintains MT5 connection and streams prices"""
    print(f"🚀 Starting MT5 Price Streamer...", file=sys.stderr)
    print(f"📍 Output file: {OUTPUT_FILE}", file=sys.stderr)
    print(f"📊 Symbols: {', '.join(SYMBOLS)}", file=sys.stderr)
    print(f"⏱️  Update interval: {UPDATE_INTERVAL}s", file=sys.stderr)
    sys.stderr.flush()
    
    # Initialize MT5
    if not initialize_mt5_with_fallback():
        write_prices_to_file([], status="error")
        print("❌ Failed to initialize MT5", file=sys.stderr)
        sys.exit(1)
    
    # Verify account info
    account_info = mt5.account_info()
    if account_info is None:
        write_prices_to_file([], status="error")
        print("❌ Failed to get account info. Is MT5 terminal logged in?", file=sys.stderr)
        mt5.shutdown()
        sys.exit(1)
    
    print(f"✅ MT5 connected. Account: {account_info.login}, Server: {account_info.server}", file=sys.stderr)
    sys.stderr.flush()
    
    consecutive_errors = 0
    max_consecutive_errors = 5
    
    try:
        while True:
            try:
                # Collect prices for all symbols
                prices = []
                for symbol in SYMBOLS:
                    price_data = get_price_from_mt5(symbol)
                    if price_data:
                        prices.append(price_data)
                
                if prices:
                    write_prices_to_file(prices, status="success")
                    consecutive_errors = 0
                    print(f"✅ Updated {len(prices)} prices at {datetime.utcnow().strftime('%H:%M:%S')}", file=sys.stderr)
                else:
                    consecutive_errors += 1
                    if consecutive_errors >= max_consecutive_errors:
                        write_prices_to_file([], status="error")
                        print(f"❌ No prices received for {consecutive_errors} consecutive attempts", file=sys.stderr)
                    
                sys.stderr.flush()
                
            except Exception as e:
                consecutive_errors += 1
                print(f"❌ Error getting prices: {e}", file=sys.stderr)
                sys.stderr.flush()
                
                if consecutive_errors >= max_consecutive_errors:
                    write_prices_to_file([], status="error")
                
                # Try to reinitialize MT5 if errors persist
                if consecutive_errors >= max_consecutive_errors * 2:
                    print("⚠️  Too many errors, attempting to reinitialize MT5...", file=sys.stderr)
                    mt5.shutdown()
                    time.sleep(5)
                    if not initialize_mt5_with_fallback():
                        print("❌ Failed to reinitialize MT5", file=sys.stderr)
                        write_prices_to_file([], status="error")
                        time.sleep(10)  # Wait longer before retry
                        continue
                    consecutive_errors = 0
            
            # Wait before next update
            time.sleep(UPDATE_INTERVAL)
            
    except KeyboardInterrupt:
        print("\n🛑 Stopping MT5 Price Streamer...", file=sys.stderr)
    except Exception as e:
        print(f"❌ Fatal error: {e}", file=sys.stderr)
        write_prices_to_file([], status="error")
    finally:
        mt5.shutdown()
        print("✅ MT5 Price Streamer stopped", file=sys.stderr)

if __name__ == '__main__':
    main()
