
import { ITradingRepository } from '@/domain/interfaces/repositories/ITradingRepository';
import { CreateTradeAlertDto, UpdateTradeAlertDto, TradeAlertResponseDto } from '@/domain/dtos/trading/CreateTradeAlertDto';

export class TradingService {
  constructor(private tradingRepository: ITradingRepository) {}

  async getAllAlerts(userId: string): Promise<TradeAlertResponseDto[]> {
    const alerts = await this.tradingRepository.findAllAlerts(userId);
    return alerts.map(alert => ({
      id: alert.id,
      userId: alert.userId,
      assetName: alert.assetName,
      tradermadeSymbol: alert.tradermadeSymbol,
      tradeType: alert.tradeType,
      entryPrice: alert.entryPrice,
      stopLoss: alert.stopLoss,
      status: alert.status,
      tp1: alert.tp1,
      tp2: alert.tp2,
      tp3: alert.tp3,
      tp4: alert.tp4,
      tp5: alert.tp5,
      tpHits: alert.tpHits,
      notes: alert.notes,
      closeReason: alert.closeReason,
      createdAt: alert.createdAt.toISOString(),
      updatedAt: alert.updatedAt.toISOString()
    }));
  }

  async getAlertsByStatus(status: 'pending' | 'active' | 'closed' | 'partially_profited', userId: string): Promise<TradeAlertResponseDto[]> {
    const alerts = await this.tradingRepository.findAlertsByStatus(status, userId);
    return alerts.map(alert => ({
      id: alert.id,
      userId: alert.userId,
      assetName: alert.assetName,
      tradermadeSymbol: alert.tradermadeSymbol,
      tradeType: alert.tradeType,
      entryPrice: alert.entryPrice,
      stopLoss: alert.stopLoss,
      status: alert.status,
      tp1: alert.tp1,
      tp2: alert.tp2,
      tp3: alert.tp3,
      tp4: alert.tp4,
      tp5: alert.tp5,
      tpHits: alert.tpHits,
      notes: alert.notes,
      closeReason: alert.closeReason,
      createdAt: alert.createdAt.toISOString(),
      updatedAt: alert.updatedAt.toISOString()
    }));
  }

  async createAlert(dto: CreateTradeAlertDto, userId: string): Promise<TradeAlertResponseDto> {
    // Validation
    if (!dto.assetName?.trim()) {
      throw new Error('Asset name is required');
    }
    if (!dto.tradermadeSymbol?.trim()) {
      throw new Error('Symbol is required');
    }
    if (dto.entryPrice <= 0) {
      throw new Error('Entry price must be positive');
    }
    if (dto.stopLoss <= 0) {
      throw new Error('Stop loss must be positive');
    }

    console.log(`🔧 Service: Creating ${dto.tradeType} order - status will be determined by database trigger`);

    const alert = await this.tradingRepository.createAlert(dto, userId);
    
    return {
      id: alert.id,
      userId: alert.userId,
      assetName: alert.assetName,
      tradermadeSymbol: alert.tradermadeSymbol,
      tradeType: alert.tradeType,
      entryPrice: alert.entryPrice,
      stopLoss: alert.stopLoss,
      status: alert.status,
      tp1: alert.tp1,
      tp2: alert.tp2,
      tp3: alert.tp3,
      tp4: alert.tp4,
      tp5: alert.tp5,
      tpHits: alert.tpHits,
      notes: alert.notes,
      closeReason: alert.closeReason,
      createdAt: alert.createdAt.toISOString(),
      updatedAt: alert.updatedAt.toISOString()
    };
  }

  async updateAlert(id: string, dto: UpdateTradeAlertDto, userId: string): Promise<TradeAlertResponseDto> {
    const existingAlert = await this.tradingRepository.findAlertById(id);
    if (!existingAlert) {
      throw new Error('Alert not found');
    }
    
    if (!existingAlert.canBeEditedBy(userId)) {
      throw new Error('Unauthorized to edit this alert');
    }

    const alert = await this.tradingRepository.updateAlert(id, dto);
    return {
      id: alert.id,
      userId: alert.userId,
      assetName: alert.assetName,
      tradermadeSymbol: alert.tradermadeSymbol,
      tradeType: alert.tradeType,
      entryPrice: alert.entryPrice,
      stopLoss: alert.stopLoss,
      status: alert.status,
      tp1: alert.tp1,
      tp2: alert.tp2,
      tp3: alert.tp3,
      tp4: alert.tp4,
      tp5: alert.tp5,
      tpHits: alert.tpHits,
      notes: alert.notes,
      closeReason: alert.closeReason,
      createdAt: alert.createdAt.toISOString(),
      updatedAt: alert.updatedAt.toISOString()
    };
  }

  async deleteAlert(id: string, userId: string): Promise<void> {
    const existingAlert = await this.tradingRepository.findAlertById(id);
    if (!existingAlert) {
      throw new Error('Alert not found');
    }
    
    if (!existingAlert.canBeEditedBy(userId)) {
      throw new Error('Unauthorized to delete this alert');
    }

    await this.tradingRepository.deleteAlert(id);
  }
}
