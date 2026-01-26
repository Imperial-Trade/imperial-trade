# Copy fixed Python script to VPS
$pythonScriptContent = @'
#!/usr/bin/env python3
"""
MT5 Price Reader - Reads live prices from EC Markets MT5 terminal
Outputs JSON to stdout for Price Feeder to consume
"""

import sys
import json
import os
import time
from datetime import datetime

try:
    import MetaTrader5 as mt5
except ImportError:
    print(json.dumps({"error": "MetaTrader5 module not installed. Run: pip install MetaTrader5"}))
    sys.exit(1)

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

def main():
    # Get symbols from command line arguments
    if len(sys.argv) < 2:
        # Default symbols if none provided
        symbols = ['XAUUSD', 'BTCUSD', 'EURUSD', 'GBPUSD', 'USDJPY']
    else:
        symbols = sys.argv[1:]
    
    # Initialize MT5 connection - Using MT5_PriceFeeder (Portable Mode)
    # CRITICAL: Use explicit path to avoid conflicts with MT5_BrokerService
    if not mt5.initialize(path=r"C:\MT5_PriceFeeder\terminal64.exe", portable=True):
        error = mt5.last_error()
        print(json.dumps({
            "error": f"MT5 initialization failed: {error}",
            "code": error[0],
            "description": error[1],
            "mt5_path": "C:\\MT5_PriceFeeder\\terminal64.exe",
            "portable": True
        }), file=sys.stderr)
        sys.exit(1)
    
    # CRITICAL: Add delay after initialization to let IPC pipe fully open
    # This prevents "IPC send failed" errors on Windows VPS
    time.sleep(2)  # Wait 2 seconds for IPC connection to be ready
    
    # Verify IPC connection is actually working
    terminal_info = mt5.terminal_info()
    if not terminal_info or not terminal_info.connected:
        error = mt5.last_error()
        print(json.dumps({
            "error": f"MT5 initialized but IPC not ready: {error}",
            "code": error[0],
            "description": error[1],
            "mt5_path": "C:\\MT5_PriceFeeder\\terminal64.exe",
            "portable": True
        }), file=sys.stderr)
        mt5.shutdown()
        sys.exit(1)
    
    # Get account info to verify connection
    account_info = mt5.account_info()
    if account_info is None:
        print(json.dumps({
            "error": "Failed to get account info. Is MT5 terminal running and logged in?",
            "mt5_path": "C:\\MT5_PriceFeeder\\terminal64.exe",
            "portable": True
        }), file=sys.stderr)
        mt5.shutdown()
        sys.exit(1)
    
    # Collect prices for all symbols
    prices = []
    for symbol in symbols:
        price_data = get_price_from_mt5(symbol)
        if price_data:
            prices.append(price_data)
    
    # Shutdown MT5
    mt5.shutdown()
    
    # Output JSON to stdout
    print(json.dumps(prices, indent=2))

if __name__ == '__main__':
    main()
'@

# Ensure directory exists
$pythonDir = "C:\imperial-price-feeder\python"
if (-not (Test-Path $pythonDir)) {
    New-Item -ItemType Directory -Path $pythonDir -Force | Out-Null
    Write-Host "✅ Created directory: $pythonDir" -ForegroundColor Green
}

# Write the fixed Python script
$pythonPath = Join-Path $pythonDir "mt5_price_reader.py"
Set-Content -Path $pythonPath -Value $pythonScriptContent -Force
Write-Host "✅ Updated Python script: $pythonPath" -ForegroundColor Green

# Verify the file was written
if (Test-Path $pythonPath) {
    $content = Get-Content $pythonPath -Raw
    if ($content -match "time.sleep\(2\)" -and $content -match "terminal_info = mt5.terminal_info\(\)") {
        Write-Host "✅ Python script verified - IPC fix included" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Python script may not have the IPC fix" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Failed to create Python script" -ForegroundColor Red
    exit 1
}
