
import { TradeAlertResponseDto } from '@/domain/dtos/trading/CreateTradeAlertDto';
import { TradingApiService } from '../services/TradingApiService';

export class TradingEntity {
  private tradingApiService: TradingApiService;

  constructor() {
    this.tradingApiService = new TradingApiService();
  }

  async getAllTradeAlerts(userId: string): Promise<TradeAlertResponseDto[]> {
    return this.tradingApiService.getTradeAlertsByUserId(userId);
  }
}

// Export placeholder entities to satisfy index.ts
export class TradeJournalEntry {
  constructor(public id: string, public content: string) {}
}

export class TradeAlert {
  constructor(public id: string, public assetName: string) {}
  
  canBeEditedBy(userId: string): boolean {
    return true;
  }
  
  get isActive(): boolean {
    return true;
  }
  
  getRiskRewardRatio(): number {
    return 1;
  }
}

export class TradingStrategy {
  constructor(public id: string, public name: string) {}
}

export class TradingGroup {
  constructor(public id: string, public name: string) {}
}

export class GroupJournalEntry {
  constructor(public id: string, public content: string) {}
}

export class VerifiedTrader {
  constructor(public id: string, public name: string) {}
}

export class TradeHistory {
  constructor(public id: string, public tradeId: string) {}
}
