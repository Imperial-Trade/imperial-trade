# Complete MT5 Data Retrieval Guide

## 🔍 What Details Can We Get When Connected to MT5?

Based on the Python scripts, here's what information we can retrieve:

## 📊 Account Information (from `test_connection.py`):

### Account Details:
- **login**: Account number (e.g., 81071266)
- **name**: Account owner name
- **server**: Broker server name (e.g., "ECMarkets-MT5-Live01")
- **company**: Broker company name
- **currency**: Account currency (USD, EUR, etc.)

### Trading Information:
- **leverage**: Account leverage (e.g., 1:500)
- **trade_mode**: Trading mode
- **margin_mode**: Margin calculation mode
- **balance**: Account balance
- **equity**: Current equity
- **profit**: Current profit/loss
- **margin**: Used margin
- **margin_free**: Free margin
- **margin_level**: Margin level percentage

## 📈 Trade History (from `fetch_trades.py`):

### Trade Details for Each Trade:
- **ticket**: Unique trade ID
- **symbol**: Trading pair (EURUSD, GBPUSD, etc.)
- **volume**: Trade size (in lots)
- **type**: Trade direction (Buy/Sell)
- **price_open**: Opening price
- **price_close**: Closing price
- **profit**: Profit/loss amount
- **swap**: Swap fees
- **commission**: Commission charged
- **time_open**: Trade opening time
- **time_close**: Trade closing time
- **comment**: Trade comment/notes

## 🧪 Testing Connection:

Testing the connection to see actual data...
