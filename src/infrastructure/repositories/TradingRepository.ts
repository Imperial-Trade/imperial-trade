
import { ITradingRepository } from '@/domain/interfaces/repositories/ITradingRepository';
import { TradeAlert } from '@/domain/entities/trading/TradeAlert';
import { CreateTradeAlertDto, UpdateTradeAlertDto } from '@/domain/dtos/trading/CreateTradeAlertDto';
import { TradingMapper } from '../mappers/TradingMapper';
import { apiClient } from '@/api/client/ApiClient';

export class TradingRepository implements ITradingRepository {
  async findAllAlerts(userId: string): Promise<TradeAlert[]> {
    const result = await apiClient.select('trade_alerts', {
      eq: { column: 'user_id', value: userId },
      order: { column: 'created_at', ascending: false }
    });
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to fetch alerts');
    }
    
    const rows = result.data as any[];
    return rows.map((row) => TradingMapper.toDomain(row));
  }

  async findAlertById(id: string): Promise<TradeAlert | null> {
    const result = await apiClient.select('trade_alerts', {
      eq: { column: 'id', value: id },
      limit: 1
    });
    
    if (!result.success || !result.data || result.data.length === 0) {
      return null;
    }
    
    return TradingMapper.toDomain(result.data[0] as any);
  }

  async findAlertsByStatus(status: 'pending' | 'active' | 'closed' | 'partially_profited', userId: string): Promise<TradeAlert[]> {
    const result = await apiClient.select('trade_alerts', {
      eq: { column: 'user_id', value: userId },
      order: { column: 'created_at', ascending: false }
    });
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to fetch alerts');
    }
    
    return (result.data as any[])
      .filter((alert: any) => alert.status === status)
      .map((row: any) => TradingMapper.toDomain(row));
  }

  async createAlert(dto: CreateTradeAlertDto, userId: string): Promise<TradeAlert> {
    // FIXED: Determine correct status based on trade type with explicit typing
    const isLimitOrder = dto.tradeType === 'buy_limit' || dto.tradeType === 'sell_limit';
    const correctStatus: 'pending' | 'active' | 'closed' | 'partially_profited' = isLimitOrder ? 'pending' : 'active';
    
    const insertData = {
      asset_name: dto.assetName,
      tradermade_symbol: dto.tradermadeSymbol,
      trade_type: dto.tradeType,
      entry_price: dto.entryPrice,
      stop_loss: dto.stopLoss,
      tp1: dto.tp1,
      tp2: dto.tp2,
      tp3: dto.tp3,
      tp4: dto.tp4,
      tp5: dto.tp5,
      notes: dto.notes,
      user_id: userId,
      status: correctStatus
    };

    console.log('Repository creating alert with status:', correctStatus, 'for trade type:', dto.tradeType);

    const result = await apiClient.insert('trade_alerts', insertData);
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to create alert');
    }
    
    return TradingMapper.toDomain(result.data as any);
  }

  async updateAlert(id: string, dto: UpdateTradeAlertDto): Promise<TradeAlert> {
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (dto.status) updateData.status = dto.status;
    if (dto.tpHits) updateData.tp_hits = dto.tpHits;
    if (dto.closeReason) updateData.close_reason = dto.closeReason;
    if (dto.notes) updateData.notes = dto.notes;

    const result = await apiClient.update('trade_alerts', id, updateData);
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to update alert');
    }
    
    return TradingMapper.toDomain(result.data as any);
  }

  async deleteAlert(id: string): Promise<void> {
    const result = await apiClient.delete('trade_alerts', id);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete alert');
    }
  }
}
