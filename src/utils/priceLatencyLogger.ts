// Zero-latency price monitoring and logging utility
export class PriceLatencyLogger {
  private static instance: PriceLatencyLogger;
  private symbolLatencies: Map<string, { lastUpdate: number; latencies: number[] }> = new Map();
  private isLoggingEnabled = process.env.NODE_ENV === 'development';

  public static getInstance(): PriceLatencyLogger {
    if (!PriceLatencyLogger.instance) {
      PriceLatencyLogger.instance = new PriceLatencyLogger();
    }
    return PriceLatencyLogger.instance;
  }

  public logPriceUpdate(symbol: string, serverTimestamp: number, clientReceiveTime?: number): void {
    if (!this.isLoggingEnabled) return;

    const receiveTime = clientReceiveTime || Date.now();
    const latency = receiveTime - serverTimestamp;
    
    if (!this.symbolLatencies.has(symbol)) {
      this.symbolLatencies.set(symbol, { lastUpdate: receiveTime, latencies: [] });
    }

    const symbolData = this.symbolLatencies.get(symbol)!;
    symbolData.latencies.push(latency);
    symbolData.lastUpdate = receiveTime;

    // Keep only last 100 latency measurements
    if (symbolData.latencies.length > 100) {
      symbolData.latencies.shift();
    }

    // Log every 10th update for performance
    if (symbolData.latencies.length % 10 === 0) {
      const avgLatency = symbolData.latencies.reduce((a, b) => a + b, 0) / symbolData.latencies.length;
      console.log(`📊 ${symbol} avg latency: ${avgLatency.toFixed(1)}ms (last: ${latency}ms)`);
    }
  }

  public displayPerformanceBanner(): void {
    if (!this.isLoggingEnabled) return;

    const banner = `
🚀 IMPERIAL TRADING - ZERO-LATENCY PRICE ENGINE
================================================
📡 TraderMade FIX Streaming: ACTIVE
⚡ Zero-Debounce Mode: ENABLED  
🎯 Target Latency: <50ms
🔄 Update Frequency: 250ms institutional ticks
💎 Authentication: Bearer token enabled
================================================
    `;
    console.log(banner);
  }

  public getSymbolStats(symbol: string): { avgLatency: number; maxLatency: number; minLatency: number } | null {
    const data = this.symbolLatencies.get(symbol);
    if (!data || data.latencies.length === 0) return null;

    const latencies = data.latencies;
    return {
      avgLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length,
      maxLatency: Math.max(...latencies),
      minLatency: Math.min(...latencies)
    };
  }
}

// Auto-display banner on import
PriceLatencyLogger.getInstance().displayPerformanceBanner();
