# Imperial Trading Test Scripts

External testing tools for the Imperial Trading Platform price ingestion system.

## External Price Simulator

The `external-price-simulator.mjs` script simulates an external price feed provider (like TraderMade) and tests the complete price-ingestor pipeline.

### Setup

1. Configure your INGEST_SECRET:
   ```bash
   export INGEST_SECRET="your-secret-key-here"
   ```

2. Run the simulator:
   ```bash
   # Basic run (30 seconds, minimal output)
   npm run test:prices
   
   # Verbose output with detailed logs
   npm run test:prices:verbose
   
   # Show help
   npm run test:prices:help
   ```

### What it tests

- ✅ Authentication with price-ingestor
- ✅ Payload format validation
- ✅ Batch price processing
- ✅ Response handling and error recovery
- ✅ Realistic price movements and volatility
- ✅ Latency measurement
- ✅ Success rate tracking

### Example Output

```
🚀 Starting External Price Feed Simulator
📊 Testing for 30s with 5 symbols
🔑 Using ingest key: abc12345...
────────────────────────────────────────────────────────────

✅ Batch sent successfully (89ms):
   Processed: 3
   Filtered: 1
   Broadcasted: 2
   Efficiency: 66.7%

═══════════════════════════════════════════════════════════
📈 PRICE SIMULATOR TEST RESULTS
═══════════════════════════════════════════════════════════
⏱️  Duration: 30.1s
📤 Batches sent: 15
✅ Successful: 15
❌ Failed: 0
📊 Success rate: 100.0%
⚡ Avg latency: 92ms

🔍 Price History:
   EURUSD: 1.08621 (+0.111%)
   GBPUSD: 1.26789 (+0.226%)
   USDJPY: 149.234 (-0.178%)
   XAUUSD: 2027.45 (+0.121%)
   BTCUSD: 43612.5 (+0.258%)

✨ Test completed successfully!
```

## Integration with Browser Tests

This external simulator works in conjunction with the browser-based testing components:

1. **ComprehensiveWebSocketTester** - Tests the client-side WebSocket reception
2. **WebSocketHealthMonitor** - Monitors connection health and performance
3. **EndToEndTestSuite** - Automated testing of the complete pipeline

Run the external simulator while using the browser tests to verify the complete data flow from external source → price-ingestor → Supabase Realtime → client display.

## Troubleshooting

### Common Issues

1. **"Invalid or missing X-INGEST-KEY header"**
   - Ensure INGEST_SECRET environment variable is set
   - Check that the secret matches your Supabase edge function configuration

2. **Connection timeouts**
   - Check your internet connection
   - Verify Supabase edge function is deployed and running

3. **No prices received in browser**
   - Ensure WebSocket connection is established
   - Check browser console for errors
   - Verify symbol subscriptions match the test symbols

### Debug Mode

Run with `--verbose` flag to see detailed request/response logs for debugging.