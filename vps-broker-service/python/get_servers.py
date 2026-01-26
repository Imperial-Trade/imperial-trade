#!/usr/bin/env python3
"""
Get MT5 Available Servers
Fetches all available MT5 servers from the terminal
"""

import sys
import json
import MetaTrader5 as mt5
from typing import List, Dict

def get_available_servers(broker_filter: str = None) -> Dict:
    """Get all available MT5 servers, optionally filtered by broker name
    
    Args:
        broker_filter: Optional broker name to filter servers (e.g., 'XS', 'ECMarkets', 'PUPrime')
    
    Returns:
        Dictionary with servers grouped by broker or all servers
    """
    initialized_by_us = False
    try:
        # CRITICAL: Use Windows-style paths (C:\...) for Wine, not Linux paths (/root/...)
        # Wine maps /root/.wine/drive_c/ to C:\
        import os
        mt5_path = None
        
        if os.path.exists('/root/.wine/drive_c/imperial-factory/mt5-master/terminal64.exe'):
            # Use Windows path format for Wine
            mt5_path = 'C:\\imperial-factory\\mt5-master\\terminal64.exe'
            print(f"✅ Found MT5 at Wine path: {mt5_path} (linked from /root/imperial-factory)")
            initialized = mt5.initialize(path=mt5_path)
        elif os.path.exists('/root/.wine/drive_c/Program Files/MetaTrader 5/terminal64.exe'):
            # Use Windows path format for Wine
            mt5_path = 'C:\\Program Files\\MetaTrader 5\\terminal64.exe'
            print(f"✅ Found MT5 at default Wine path: {mt5_path}")
            initialized = mt5.initialize(path=mt5_path)
        elif os.path.exists('/root/imperial-factory/mt5-master/terminal64.exe'):
            # Fallback: Linux path (will try to convert, but may fail)
            print("⚠️  WARNING: Using Linux path - may cause IPC timeout. Consider creating symlink to Wine drive_c")
            mt5_path = '/root/imperial-factory/mt5-master/terminal64.exe'
            initialized = mt5.initialize(path=mt5_path)
        else:
            # Fallback: auto-detect
            print("MT5 path not found, using auto-detection")
            initialized = mt5.initialize()
        
        if not initialized:
            error = mt5.last_error()
            return {
                "success": False,
                "error": f"MT5 initialization failed: {error}",
                "servers": []
            }
        
        initialized_by_us = True
        
        # Get all available servers
        servers = mt5.servers_get()
        
        if servers is None:
            error = mt5.last_error()
            return {
                "success": False,
                "error": f"Failed to get servers: {error}",
                "servers": []
            }
        
        # Convert to list of dictionaries
        servers_list = []
        for server in servers:
            server_info = {
                "name": server.name,
                "description": server.description if hasattr(server, 'description') else '',
                "broker": server.broker if hasattr(server, 'broker') else '',
            }
            servers_list.append(server_info)
        
        # Filter by broker if specified
        if broker_filter:
            broker_filter_lower = broker_filter.lower()
            filtered = [
                s for s in servers_list
                if broker_filter_lower in s['name'].lower() or 
                   broker_filter_lower in s['broker'].lower()
            ]
            servers_list = filtered
        
        # Group by broker for easier lookup
        grouped = {}
        for server in servers_list:
            broker_key = server['broker'] or 'Unknown'
            if broker_key not in grouped:
                grouped[broker_key] = []
            grouped[broker_key].append(server['name'])
        
        return {
            "success": True,
            "servers": servers_list,
            "grouped": grouped,
            "count": len(servers_list)
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "servers": []
        }
    finally:
        if initialized_by_us:
            try:
                mt5.shutdown()
            except:
                pass

if __name__ == "__main__":
    try:
        broker_filter = None
        if len(sys.argv) > 1:
            broker_filter = sys.argv[1]
        
        result = get_available_servers(broker_filter)
        print(json.dumps(result, indent=2))
    except Exception as e:
        error_result = {
            "success": False,
            "error": str(e),
            "servers": []
        }
        print(json.dumps(error_result))
        sys.exit(1)








