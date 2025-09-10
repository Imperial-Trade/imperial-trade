import { supabase } from '@/integrations/supabase/client';

interface PriceData {
  symbol: string;
  price: number;
  change: number;
  bid: number;
  ask: number;
  timestamp: number;
}

class MockPriceGenerator {
  private intervalId: NodeJS.Timeout | null = null;
  private basePrice = {
    XAUUSD: 2650.00,
    BTCUSD: 95000
  };

  start() {
    if (this.intervalId) return;

    this.intervalId = setInterval(() => {
      this.generateAndBroadcastPrices();
    }, 2000);

    // Generate initial prices immediately
    this.generateAndBroadcastPrices();
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private generateAndBroadcastPrices() {
    const symbols = ['XAUUSD', 'BTCUSD'] as const;
    
    symbols.forEach(symbol => {
      const price = this.generatePrice(symbol);
      const priceData: PriceData = {
        symbol,
        price: price.mid,
        change: price.change,
        bid: price.bid,
        ask: price.ask,
        timestamp: Date.now()
      };

      // Broadcast via Supabase realtime
      supabase.channel('live-prices-broadcast').send({
        type: 'broadcast',
        event: 'price_update',
        payload: priceData
      });
    });
  }

  private generatePrice(symbol: 'XAUUSD' | 'BTCUSD') {
    const basePrice = this.basePrice[symbol];
    const volatility = symbol === 'XAUUSD' ? 0.001 : 0.01; // 0.1% for gold, 1% for Bitcoin
    
    // Generate random movement
    const randomMove = (Math.random() - 0.5) * volatility * basePrice;
    const newPrice = basePrice + randomMove;
    
    // Update base price for next iteration
    this.basePrice[symbol] = newPrice;
    
    const spread = symbol === 'XAUUSD' ? 0.50 : 50; // $0.50 for gold, $50 for Bitcoin
    const bid = newPrice - spread / 2;
    const ask = newPrice + spread / 2;
    
    return {
      mid: Math.round(newPrice * 100) / 100,
      bid: Math.round(bid * 100) / 100,
      ask: Math.round(ask * 100) / 100,
      change: randomMove
    };
  }
}

export const mockPriceGenerator = new MockPriceGenerator();