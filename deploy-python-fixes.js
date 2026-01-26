// Deployment script to update Python files on VPS
// Run this on the VPS: node deploy-python-fixes.js

const fs = require('fs');
const path = require('path');

// The fixed fetch_trades.py content
const fetchTradesContent = `#!/usr/bin/env python3
"""
Fetch MT5 Trades
Fetches all closed trades from MT5 broker
"""

import sys
import json
import MetaTrader5 as mt5
from datetime import datetime, timedelta

def fetch_trades(login, password, server):
    """Fetch all closed trades from MT5
    
    IMPORTANT: This uses the Generic MT5 terminal (not EC Markets MT5)
    - EC Markets MT5 is reserved for live price feeds only
    - Generic MT5 is used for auto-sync journal connections
    - Python MT5 library connects to Generic MT5 at: C:\\Program Files\\MetaTrader 5\\terminal64.exe
    """
    initialized_by_us = False
    try:
        # CRITICAL: Use ONLY Generic MT5 path (NOT EC Markets MT5)
        # This ensures we don't interfere with the live price feeder
        generic_mt5_path = r"C:\\Program Files\\MetaTrader 5\\terminal64.exe"
        
        # Try to initialize with Generic MT5 path ONLY
        # NEVER fall back to default initialize() as it might connect to EC Markets MT5
        initialized = mt5.initialize(path=generic_mt5_path)
        last_error = None
        
        if not initialized:
            last_error = mt5.last_error()
            return {
                "trades": [],
                "account_balance": 0,
                "error": f"MT5 initialization failed: {last_error}. Generic MT5 must be running at '{generic_mt5_path}'. Do NOT use EC Markets MT5 as it's reserved for live price feeds."
            }
        
        # Mark that we successfully initialized, so we can safely shutdown later
        initialized_by_us = True
        
        # Login
        authorized = mt5.login(int(login), password=password, server=server)
        
        if not authorized:
            return {
                "trades": [],
                "account_balance": 0,
                "error": f"Login failed: {mt5.last_error()}"
            }
        
        # Get account info
        account_info = mt5.account_info()
        account_balance = account_info.balance if account_info else 0
        
        # Fetch closed deals (trades)
        # Get deals from last 90 days
        from_date = datetime.now() - timedelta(days=90)
        to_date = datetime.now()
        
        deals = mt5.history_deals_get(from_date, to_date)
        
        if deals is None:
            return {
                "trades": [],
                "account_balance": account_balance
            }
        
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
        
        return {
            "trades": trades,
            "account_balance": account_balance
        }
    except Exception as e:
        return {
            "trades": [],
            "account_balance": 0,
            "error": str(e)
        }
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
            credentials["server"]
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
`;

// The fixed test_connection.py content  
const testConnectionContent = `#!/usr/bin/env python3
"""
Test MT5 Connection
Tests login to MT5 broker and returns account info
"""

import sys
import json
import MetaTrader5 as mt5

def test_connection(login, password, server):
    """Test MT5 connection and return account info
    CRITICAL: Uses ONLY Generic MT5 (NOT EC Markets MT5) to avoid interfering with price feeder
    """
    initialized_by_us = False
    try:
        # CRITICAL: Use ONLY Generic MT5 path (NOT EC Markets MT5)
        generic_mt5_path = r"C:\\Program Files\\MetaTrader 5\\terminal64.exe"
        
        # Initialize with Generic MT5 path ONLY
        # NEVER use default initialize() as it might connect to EC Markets MT5
        if not mt5.initialize(path=generic_mt5_path):
            return {
                "connected": False,
                "error": f"MT5 initialization failed: {mt5.last_error()}. Generic MT5 must be running at '{generic_mt5_path}'. Do NOT use EC Markets MT5 as it's reserved for live price feeds."
            }
        
        initialized_by_us = True
        
        # Login
        authorized = mt5.login(int(login), password=password, server=server)
        
        if not authorized:
            error = mt5.last_error()
            if initialized_by_us:
                mt5.shutdown()
            return {
                "connected": False,
                "error": f"Login failed: {error}"
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
`;

// Deploy files
const fetchPath = 'C:\\vps-broker-service\\python\\fetch_trades.py';
const testPath = 'C:\\vps-broker-service\\python\\test_connection.py';

try {
    // Ensure directory exists
    const pythonDir = path.dirname(fetchPath);
    if (!fs.existsSync(pythonDir)) {
        fs.mkdirSync(pythonDir, { recursive: true });
    }
    
    // Write files
    fs.writeFileSync(fetchPath, fetchTradesContent, 'utf8');
    console.log('✅ Deployed fetch_trades.py');
    
    fs.writeFileSync(testPath, testConnectionContent, 'utf8');
    console.log('✅ Deployed test_connection.py');
    
    // Verify
    const fetchContent = fs.readFileSync(fetchPath, 'utf8');
    const testContent = fs.readFileSync(testPath, 'utf8');
    
    if (fetchContent.includes('initialized_by_us')) {
        console.log('✅ VERIFIED: fetch_trades.py has fix');
    } else {
        console.log('❌ fetch_trades.py missing fix');
    }
    
    if (testContent.includes('initialized_by_us')) {
        console.log('✅ VERIFIED: test_connection.py has fix');
    } else {
        console.log('❌ test_connection.py missing fix');
    }
} catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
}


