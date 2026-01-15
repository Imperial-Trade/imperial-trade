# MT5 Connection - What Details Can We Retrieve?

## 📊 Account Information (from `test_connection.py`):

When connecting to MT5, we can retrieve:

### Basic Account Info:
- **login**: Account number (e.g., 81071266)
- **name**: Account name/owner name
- **server**: Broker server (e.g., "ECMarkets-MT5-Live01")
- **company**: Broker company name
- **currency**: Account currency (e.g., USD, EUR)

### Trading Settings:
- **leverage**: Account leverage (e.g., 1:500)
- **trade_mode**: Trading mode
- **margin_mode**: Margin mode
- **trade_allowed**: Whether trading is allowed
- **trade_expert**: Whether expert advisors are allowed
- **fifo_close**: FIFO close mode

### Balance Information:
- **balance**: Account balance
- **equity**: Current equity
- **profit**: Current profit/loss
- **credit**: Credit amount
- **margin**: Used margin
- **margin_free**: Free margin
- **margin_level**: Margin level percentage

### Additional Info:
- **limit_orders**: Number of pending orders
- **currency_digits**: Currency decimal places

## 📈 Trade History (from `fetch_trades.py`):

When fetching trades, we can retrieve:

### Trade Details:
- **ticket**: Unique trade ticket ID
- **symbol**: Trading instrument (e.g., EURUSD, GBPUSD)
- **volume**: Trade volume (lot size)
- **type**: Trade type (Buy/Sell)
- **price_open**: Opening price
- **price_current**: Current price
- **price_close**: Closing price
- **profit**: Profit/loss amount
- **swap**: Swap amount
- **commission**: Commission charged
- **time_open**: Opening time
- **time_close**: Closing time
- **time_current**: Current time
- **comment**: Trade comment
- **magic**: Magic number (EA identifier)

## 🔍 Checking Current Connection:

Let me test the connection to see what data is available...
