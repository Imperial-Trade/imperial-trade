# Imperial Trade - VPS Broker Service

Node.js service for connecting to MT5 brokers and fetching trades.

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Install Python Dependencies

```bash
pip3 install MetaTrader5
```

### 3. Configure Environment

Copy `.env.example` to `.env` and set:

```bash
PORT=3000
VPS_API_KEY=your-secure-api-key-here
ENCRYPTION_SECRET=ImperialTrade_BrokerEncryption_2025_v1
```

**Important:** The `ENCRYPTION_SECRET` must match the `VITE_ENCRYPTION_SECRET` in your frontend `.env` file.

### 4. Build and Run

```bash
# Build TypeScript
npm run build

# Run service
npm start

# Or for development
npm run dev
```

### 5. Run as Windows Service (24/7)

Use PM2 (recommended):

```bash
npm install -g pm2
pm2 start dist/index.js --name "imperial-broker-service"
pm2 save
pm2 startup
```

Or use Windows Task Scheduler to run `npm start` on boot.

## API Endpoints

### Health Check
```
GET /health
```

### Test Connection
```
POST /test-connection
Headers:
  X-API-Key: <your-api-key>
Body:
  {
    "broker_type": "EC_MARKETS",
    "encrypted_login": "...",
    "encrypted_password": "...",
    "encrypted_server": "...",
    "user_id": "..."
  }
```

### Fetch Trades
```
POST /fetch-trades
Headers:
  X-API-Key: <your-api-key>
Body:
  {
    "encrypted_login": "...",
    "encrypted_password": "...",
    "encrypted_server": "...",
    "user_id": "..."
  }
```

## Security

- All credentials are encrypted using AES-256-GCM
- API key required for all endpoints
- Credentials are decrypted only in memory
- Never logged or stored in plain text

## Troubleshooting

1. **MT5 not connecting**: Ensure MT5 terminal is installed and running on the VPS
2. **Python errors**: Make sure `MetaTrader5` library is installed: `pip3 install MetaTrader5`
3. **Port conflicts**: Change `PORT` in `.env` if 3000 is already in use

