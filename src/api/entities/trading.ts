import { TradeAlert } from '@/domain/entities/trading/TradeAlert';
import { TradingApiService } from '../services/TradingApiService';

export class TradingEntity {
  private tradingApiService: TradingApiService;

  constructor() {
    this.tradingApiService = new TradingApiService();
  }

  async getAllTradeAlerts(userId: string): Promise<TradeAlert[]> {
    return this.tradingApiService.getTradeAlertsByUserId(userId);
  }
}
