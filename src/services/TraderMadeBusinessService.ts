import { ASSET_REGISTRY, type AssetDefinition } from '@/types/assets';

export interface BusinessPlanFeatures {
  maxSymbols: number;
  rateLimit: number;
  realTimeData: boolean;
  historicalData: boolean;
  advancedFeatures: string[];
  cacheTTL: {
    priority: number;
    regular: number;
    high_priority: number;
  };
}

export interface TraderMadeBusinessConfig {
  plan: 'business';
  features: BusinessPlanFeatures;
  symbols: {
    forex: string[];
    commodities: string[];
    crypto: string[];
    indices: string[];
  };
  performance: {
    updateFrequency: number;
    connectionPoolSize: number;
    maxConcurrentRequests: number;
  };
}

export class TraderMadeBusinessService {
  private static instance: TraderMadeBusinessService;
  private config: TraderMadeBusinessConfig;

  private constructor() {
    this.config = {
      plan: 'business',
      features: {
        maxSymbols: 50,
        rateLimit: 1000, // 1000 requests/minute
        realTimeData: true,
        historicalData: true,
        advancedFeatures: [
          'tick-by-tick-data',
          'market-depth',
          'extended-hours',
          'news-sentiment',
          'economic-calendar'
        ],
        cacheTTL: {
          priority: 500,     // 0.5s for active alerts
          regular: 10000,    // 10s for regular symbols  
          high_priority: 500 // 0.5s for Gold, BTC, etc.
        }
      },
      symbols: {
        forex: [
          'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD', 'USDCHF', 'EURGBP',
          'EURJPY', 'GBPJPY', 'AUDJPY', 'CADJPY', 'CHFJPY', 'EURCHF', 'EURAUD', 'GBPAUD',
          'GBPCAD', 'AUDCAD', 'AUDNZD', 'EURNZD', 'GBPNZD', 'NZDCAD', 'NZDJPY'
        ],
        commodities: ['XAUUSD', 'XAGUSD', 'WTIUSD', 'BRENTUSD', 'NATGASUSD'],
        crypto: ['BTCUSD', 'ETHUSD', 'LTCUSD', 'ADAUSD'],
        indices: ['USA30USD', 'NAS100USD', 'SPX500USD', 'UK100USD', 'GER40USD', 'FRA40USD', 'JPN225USD']
      },
      performance: {
        updateFrequency: 500,      // 500ms updates
        connectionPoolSize: 5,     // Multiple connections
        maxConcurrentRequests: 100 // Higher concurrency
      }
    };
  }

  public static getInstance(): TraderMadeBusinessService {
    if (!TraderMadeBusinessService.instance) {
      TraderMadeBusinessService.instance = new TraderMadeBusinessService();
    }
    return TraderMadeBusinessService.instance;
  }

  public getConfiguration(): TraderMadeBusinessConfig {
    return this.config;
  }

  public getAllSymbols(): string[] {
    return [
      ...this.config.symbols.forex,
      ...this.config.symbols.commodities,
      ...this.config.symbols.crypto,
      ...this.config.symbols.indices
    ];
  }

  public getSymbolsByCategory(category: keyof TraderMadeBusinessConfig['symbols']): string[] {
    return this.config.symbols[category] || [];
  }

  public isHighPrioritySymbol(symbol: string): boolean {
    return ['XAUUSD', 'BTCUSD', 'EURUSD', 'GBPUSD', 'USDJPY'].includes(symbol);
  }

  public getCacheTTL(symbol: string, isPriorityAlert: boolean = false): number {
    if (isPriorityAlert) return this.config.features.cacheTTL.priority;
    if (this.isHighPrioritySymbol(symbol)) return this.config.features.cacheTTL.high_priority;
    return this.config.features.cacheTTL.regular;
  }

  public getRateLimit(): number {
    return this.config.features.rateLimit;
  }

  public getUpdateFrequency(): number {
    return this.config.performance.updateFrequency;
  }

  public getAssetDefinition(symbol: string): AssetDefinition | null {
    return Object.values(ASSET_REGISTRY).find(
      asset => asset.symbol === symbol || asset.tradermadeSymbol === symbol
    ) || null;
  }

  public validateBusinessPlanSymbol(symbol: string): boolean {
    return this.getAllSymbols().includes(symbol.toUpperCase());
  }

  public getMarketSessionOptimization(): {
    forex: boolean;
    commodities: boolean;
    crypto: boolean;
    indices: boolean;
  } {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcDay = now.getUTCDay();
    const isWeekday = utcDay >= 1 && utcDay <= 5;

    return {
      forex: isWeekday && ((utcHour >= 22) || (utcHour <= 21)), // 24/5 forex
      commodities: isWeekday && (utcHour >= 1 && utcHour <= 22), // Commodity hours
      crypto: true, // 24/7
      indices: isWeekday && (utcHour >= 14 && utcHour <= 21) // US market hours
    };
  }

  public getOptimalBatchSize(symbolCount: number): number {
    // Business plan allows larger batches
    if (symbolCount <= 10) return symbolCount;
    if (symbolCount <= 25) return 10;
    return 15; // Max batch size for business plan
  }
}

// Export singleton instance
export const traderMadeBusinessService = TraderMadeBusinessService.getInstance();