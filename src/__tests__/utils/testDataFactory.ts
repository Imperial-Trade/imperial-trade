
import { TradeAlertData } from '@/types/TradeAlertData';

// Simple test data generator without external dependencies
export class TestDataFactory {
  static createTradeAlert(overrides: Partial<TradeAlertData> = {}): TradeAlertData {
    const baseId = Math.random().toString(36).substring(2, 15);
    
    return {
      id: `test-${baseId}`,
      user_id: 'test-user-id',
      asset_name: 'EUR/USD',
      tradermade_symbol: 'EURUSD',
      trade_type: 'buy',
      entry_price: 1.1000,
      stop_loss: 1.0950,
      status: 'active',
      tp1: 1.1050,
      tp2: 1.1100,
      tp_hits: [],
      notes: 'Test signal',
      created_date: new Date().toISOString(),
      updated_date: new Date().toISOString(),
      creator: {
        id: 'creator-id',
        display_name: 'Test Creator',
        role: 'educator',
        avatar_url: null
      },
      ...overrides
    };
  }

  static createMultipleTradeAlerts(count: number): TradeAlertData[] {
    return Array.from({ length: count }, (_, index) => 
      this.createTradeAlert({
        id: `test-alert-${index}`,
        asset_name: `Test Asset ${index}`
      })
    );
  }
}
