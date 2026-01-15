# Imperial Brain - Go Orchestrator

The Go Brain manages Docker container lifecycle for MT5 trade synchronization.

## Setup

### 1. Install Dependencies

```bash
cd /root/imperial-factory/broker-service/go-brain
go mod download
```

### 2. Configure Database Connection

Set the `DATABASE_URL` environment variable:

```bash
export DATABASE_URL="postgres://postgres.kmuoqkcxguafxulqlbmi:Tradeimperial%40315@aws-0-us-west-1.pooler.supabase.com:6543/postgres?sslmode=require"
export LISTENER_DATABASE_URL="postgres://postgres.kmuoqkcxguafxulqlbmi:Tradeimperial%40315@db.kmuoqkcxguafxulqlbmi.supabase.co:5432/postgres?sslmode=require"
export ENCRYPTION_SECRET="ImperialTrade_BrokerEncryption_2025_v1"
```

**Note**: For production, use systemd service file (imperial-brain.service) which sets these automatically.
The `LISTENER_DATABASE_URL` must use direct connection (port 5432) for LISTEN/NOTIFY - poolers don't support it.

### 3. Build

```bash
go build -o imperial-brain main.go
```

### 4. Run

```bash
./imperial-brain
```

## Systemd Service

See `imperial-brain.service` for systemd configuration.

## Configuration

- `MAX_WORKERS`: Maximum concurrent containers (default: 25)
- `CONTAINER_LIFETIME`: How long containers run before auto-kill (default: 90s)
- `POLL_INTERVAL`: How often to check for new sync tasks (default: 5s)

## How It Works

1. Queries `next_sync_task` view for connections ready to sync
2. Decrypts credentials using AES-256-GCM
3. Creates dynamic `launch.ini` files
4. Launches Docker containers with `imperial-mt5-worker` image
5. Auto-kills containers after 90 seconds
6. Cleans up zombie containers periodically
