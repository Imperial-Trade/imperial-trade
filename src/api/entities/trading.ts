
import { tradingApiService } from '../services/TradingApiService';
import { adminTradingService } from '../services/AdminTradingService';
import { CreateTradeAlertDto, UpdateTradeAlertDto, TradeAlertResponseDto } from '@/domain/dtos/trading/CreateTradeAlertDto';
import { apiClient } from '../client/ApiClient';
import { TradeAlertWithProfile } from '../services/TradingApiService';

// Helper to narrow/normalize closeReason into the strict union
const normalizeCloseReason = (value?: string):
  | 'manual'
  | 'stop_loss'
  | 'tp1'
  | 'tp2'
  | 'tp3'
  | 'tp4'
  | 'tp5'
  | 'reversal_after_tp'
  | 'all_tps_hit'
  | undefined => {
  if (!value) return undefined;
  const allowed = new Set([
    'manual',
    'stop_loss',
    'tp1',
    'tp2',
    'tp3',
    'tp4',
    'tp5',
    'reversal_after_tp',
    'all_tps_hit',
  ]);
  return allowed.has(value) ? (value as any) : undefined;
};

const toResponseDto = (alert: TradeAlertWithProfile): TradeAlertResponseDto => ({
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
  closeReason: normalizeCloseReason(alert.closeReason),
  createdAt: alert.createdAt,
  updatedAt: alert.updatedAt,
});

// Legacy wrapper for backward compatibility
export class TradeAlert {
  static async getByStatus(status: 'pending' | 'active' | 'closed', userId: string): Promise<TradeAlertResponseDto[]> {
    const result = await tradingApiService.getAlertsByStatus(status, userId);
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch alerts by status');
    }
    const data = result.data || [];
    return data.map(toResponseDto);
  }

  static async list(userId: string): Promise<TradeAlertResponseDto[]> {
    const result = await tradingApiService.getAllAlerts(userId);
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch alerts');
    }
    const data = result.data || [];
    return data.map(toResponseDto);
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
        closeReason: normalizeCloseReason(alert.close_reason),
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

