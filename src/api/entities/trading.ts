
import { tradingApiService } from '../services/TradingApiService';
import { adminTradingService } from '../services/AdminTradingService';
import { CreateTradeAlertDto, UpdateTradeAlertDto, TradeAlertResponseDto } from '@/domain/dtos/trading/CreateTradeAlertDto';
import { apiClient } from '../client/ApiClient';

// Legacy wrapper for backward compatibility
export class TradeAlert {
  static async getByStatus(status: 'pending' | 'active' | 'closed', userId: string): Promise<TradeAlertResponseDto[]> {
    const result = await tradingApiService.getAlertsByStatus(status, userId);
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch alerts by status');
    }
    return result.data || [];
  }

  static async list(userId: string): Promise<TradeAlertResponseDto[]> {
    const result = await tradingApiService.getAllAlerts(userId);
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch alerts');
    }
    return result.data || [];
  }

  // Admin-specific method to get all alerts
  static async listAllForAdmin(): Promise<TradeAlertResponseDto[]> {
    const result = await adminTradingService.getAllAlertsForAdmin();
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch all alerts for admin');
    }
    return result.data || [];
  }

  static async getById(id: string): Promise<TradeAlertResponseDto | null> {
    try {
      const result = await apiClient.select('trade_alerts', {
        eq: { column: 'id', value: id }
      });
      
      if (!result.success || !result.data || result.data.length === 0) {
        return null;
      }

      const alert = result.data[0];
      return {
        id: alert.id,
        userId: alert.user_id,
        assetName: alert.asset_name,
        tradermadeSymbol: alert.tradermade_symbol,
        tradeType: alert.trade_type,
        entryPrice: Number(alert.entry_price),
        stopLoss: Number(alert.stop_loss),
        status: alert.status,
        tp1: alert.tp1 ? Number(alert.tp1) : undefined,
        tp2: alert.tp2 ? Number(alert.tp2) : undefined,
        tp3: alert.tp3 ? Number(alert.tp3) : undefined,
        tp4: alert.tp4 ? Number(alert.tp4) : undefined,
        tp5: alert.tp5 ? Number(alert.tp5) : undefined,
        tpHits: alert.tp_hits || [],
        notes: alert.notes,
        closeReason: alert.close_reason,
        createdAt: alert.created_at,
        updatedAt: alert.updated_at
      };
    } catch (error) {
      console.error('Error fetching alert by ID:', error);
      return null;
    }
  }

  static async create(entityData: CreateTradeAlertDto, userId: string): Promise<TradeAlertResponseDto> {
    const result = await tradingApiService.createAlert(entityData, userId);
    if (!result.success) {
      throw new Error(result.error || 'Failed to create alert');
    }
    return result.data!;
  }

  static async update(id: string, entityData: UpdateTradeAlertDto, userId: string): Promise<TradeAlertResponseDto> {
    const result = await tradingApiService.updateAlert(id, entityData, userId);
    if (!result.success) {
      throw new Error(result.error || 'Failed to update alert');
    }
    return result.data!;
  }

  static async delete(id: string, userId: string): Promise<void> {
    const result = await tradingApiService.deleteAlert(id, userId);
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete alert');
    }
  }
}

// Keep other classes as simple wrappers for now
export { TradeJournalEntry, TradingStrategy, TradingGroup, GroupJournalEntry, VerifiedTrader, TradeHistory } from '../base/BaseEntity';
