import { Container } from '@/infrastructure/di/Container';
import { TradingService } from '@/application/services/TradingService';
import { CreateTradeAlertDto, UpdateTradeAlertDto } from '@/domain/dtos/trading/CreateTradeAlertDto';

// Legacy wrapper for backward compatibility
export class TradeAlert {
  private static get service(): TradingService {
    return Container.getInstance().get<TradingService>('TradingService');
  }

  static async getByStatus(status: 'pending' | 'active' | 'closed', userId: string) {
    return this.service.getAlertsByStatus(status, userId);
  }

  static async list(userId: string) {
    return this.service.getAllAlerts(userId);
  }

  static async getById(id: string) {
    const service = this.service;
    const alerts = await service.getAllAlerts(''); // This needs user context
    return alerts.find(alert => alert.id === id) || null;
  }

  static async create(entityData: CreateTradeAlertDto, userId: string) {
    return this.service.createAlert(entityData, userId);
  }

  static async update(id: string, entityData: UpdateTradeAlertDto, userId: string) {
    return this.service.updateAlert(id, entityData, userId);
  }

  static async delete(id: string, userId: string) {
    return this.service.deleteAlert(id, userId);
  }
}

// Keep other classes as simple wrappers for now
export { TradeJournalEntry, TradingStrategy, TradingGroup, GroupJournalEntry, VerifiedTrader, TradeHistory } from '../base/BaseEntity';
