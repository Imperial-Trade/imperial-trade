# MT5 Connection - Complete Data Details Guide

## 📊 Account Information (from `test_connection.py`):

When connected to MT5, we can retrieve comprehensive account details:

### Basic Account Info:
- **login**: Account number (e.g., 81071266)
- **name**: Account owner name (the account holder's name)
- **server**: Broker server name (e.g., "ECMarkets-MT5-Live01")
- **company**: Broker company name (e.g., "EC Markets")
- **currency**: Account currency (USD, EUR, GBP, etc.)

### Trading Settings:
- **leverage**: Account leverage ratio (e.g., 1:500)
- **trade_mode**: Trading mode (DEMO, CONTEST, REAL)
- **margin_mode**: Margin calculation mode (ACCOUNT_MARGIN_MODE_RETAIL_NETTING, etc.)
- **trade_allowed**: Whether trading is enabled
- **trade_expert**: Whether Expert Advisors are allowed
- **fifo_close**: FIFO (First In First Out) close mode

### Balance Information:
- **balance**: Account balance (initial deposit + profits)
- **equity**: Current equity (balance + floating profit/loss)
- **profit**: Current floating profit/loss
- **credit**: Credit amount
- **margin**: Used margin
- **margin_free**: Free margin available
- **margin_level**: Margin level percentage (equity/margin * 100)

### Additional Info:
- **limit_orders**: Number of pending orders
- **currency_digits**: Number of decimal places for currency

## 📈 Trade History (from `fetch_trades.py`):

When fetching trades, we retrieve all **closed trades** from the last **90 days**:

### For Each Trade:
- **ticket**: Unique trade position ID
- **symbol**: Trading instrument (EURUSD, GBPUSD, XAUUSD, etc.)
- **type**: Trade direction (0 = Buy/Long, 1 = Sell/Short)
- **volume**: Trade volume in lots
- **price_open**: Opening price of the trade
- **price_close**: Closing price of the trade
- **price_current**: Current price (at time of fetch)
- **profit**: Profit/loss amount for the trade
- **swap**: Swap fees charged
- **commission**: Commission charged
- **time**: Opening time (Unix timestamp)
- **time_close**: Closing time (Unix timestamp)
- **comment**: Trade comment/notes
- **sl**: Stop loss (if set)
- **tp**: Take profit (if set)

### Summary Info:
- **account_balance**: Current account balance
- **account_equity**: Current account equity
- **account_currency**: Account currency
- **total_trades**: Total number of closed trades found

## 📝 Example Response Structure:

### Connection Test Response:
```json
{
  "connected": true,
  "account_info": {
    "login": 81071266,
    "name": "Account Owner Name",
    "server": "ECMarkets-MT5-Live01",
    "company": "EC Markets",
    "currency": "USD",
    "balance": 10000.00,
    "equity": 10250.50,
    "profit": 250.50,
    "leverage": 500,
    "trade_allowed": true,
    ...
  }
}
```

### Trade History Response:
```json
{
  "trades": [
    {
      "ticket": 12345678,
      "symbol": "EURUSD",
      "type": 0,
      "volume": 0.1,
      "price_open": 1.08500,
      "price_close": 1.08750,
      "profit": 25.00,
      "time": 1704067200,
      "time_close": 1704153600,
      ...
    }
  ],
  "account_balance": 10000.00,
  "total_trades": 50
}
```

## 🔍 Key Points:

1. **Account Name**: The `name` field contains the account owner's name from the broker
2. **Trade History**: Fetches closed trades from the last 90 days
3. **Real-time Data**: Balance, equity, profit are current values
4. **Comprehensive Info**: We get all major account and trade details
