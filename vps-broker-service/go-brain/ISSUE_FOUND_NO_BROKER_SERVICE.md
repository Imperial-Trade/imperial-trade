# 🚨 ISSUE FOUND: Node.js Broker Service NOT Running

## **Date:** January 15, 2026

## ❌ **Root Cause Identified**

The frontend error "Edge Function returned a non-2xx status code" occurs because:

**The Node.js Broker Service is NOT running on the VPS!**

### **What's happening:**

1. Frontend calls edge function `test-broker-connection`
2. Edge function tries to call `VPS_MT5_SERVICE_URL/test-connection`
3. **But there's no service running on the VPS at that endpoint!**
4. Connection fails → Edge function returns error → Frontend shows error

### **Evidence:**

```bash
# pm2 list shows NO processes
┌────┬───────────┬─────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┬──────────┬──────────┬──────────┬──────────┐
│ id │ name      │ namespace   │ version │ mode    │ pid      │ uptime │ ↺    │ status    │ cpu      │ mem      │ user     │ watching │
└────┴───────────┴─────────────┴─────────┴─────────┴──────────┴────────┴──────┴───────────┴──────────┴──────────┴──────────┴──────────┘

# No services on expected ports
ss -tlnp | grep -E '3001|3000' → No results
```

### **Services Currently Running:**

| Service | Status | Port | Purpose |
|---------|--------|------|---------|
| `imperial-brain.service` | ✅ Running | N/A | Docker container orchestration |
| Node.js Broker Service | ❌ **NOT RUNNING** | 3001 | Handle `/test-connection` requests |

## 🔧 **Solution Required**

### **Option 1: Deploy Node.js Broker Service**

Deploy and start the Node.js broker service from `vps-broker-service/`:

```bash
# On VPS
cd /root/imperial-factory/broker-service
npm install
npm run build
pm2 start dist/index.js --name imperial-trade-broker-service
pm2 save
```

### **Option 2: Add test-connection to Go Brain**

Modify Go Brain to expose an HTTP endpoint for `/test-connection` requests.

## 📋 **Required Files for Option 1**

Need to upload to VPS:
- `vps-broker-service/src/` directory
- `vps-broker-service/package.json`
- `vps-broker-service/tsconfig.json`
- `vps-broker-service/.env` with secrets

## ⚠️ **This is the blocking issue!**

The frontend cannot connect to brokers until the Node.js service is running on port 3001.
