
import { supabase } from '@/integrations/supabase/client';
import { ITradingRepository } from '@/domain/interfaces/repositories/ITradingRepository';
import { TradeAlert } from '@/domain/entities/trading/TradeAlert';
import { CreateTradeAlertDto, UpdateTradeAlertDto } from '@/domain/dtos/trading/CreateTradeAlertDto';
import { TradingMapper } from '../mappers/TradingMapper';

export class TradingRepository implements ITradingRepository {
  async findAllAlerts(userId: string): Promise<TradeAlert[]> {
    const { data, error } = await supabase
      .from('trade_alerts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data.map(TradingMapper.toDomain);
  }

  async findAlertById(id: string): Promise<TradeAlert | null> {
    const { data, error } = await supabase
      .from('trade_alerts')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    
    return TradingMapper.toDomain(data);
  }

  async findAlertsByStatus(status: 'pending' | 'active' | 'closed', userId: string): Promise<TradeAlert[]> {
    const { data, error } = await supabase
      .from('trade_alerts')
      .select('*')
      .eq('user_id', userId)
      .eq('status', status)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data.map(TradingMapper.toDomain);
  }

  async createAlert(dto: CreateTradeAlertDto, userId: string): Promise<TradeAlert> {
    const { data, error } = await supabase
      .from('trade_alerts')
      .insert([{
        asset_name: dto.assetName,
        finnhub_symbol: dto.finnhubSymbol,
        trade_type: dto.tradeType,
        entry_price: dto.entryPrice,
        stop_loss: dto.stopLoss,
        tp1: dto.tp1,
        tp2: dto.tp2,
        tp3: dto.tp3,
        tp4: dto.tp4,
        tp5: dto.tp5,
        notes: dto.notes,
        user_id: userId
      }])
      .select()
      .single();
    
    if (error) throw error;
    return TradingMapper.toDomain(data);
  }

  async updateAlert(id: string, dto: UpdateTradeAlertDto): Promise<TradeAlert> {
    const { data, error } = await supabase
      .from('trade_alerts')
      .update({
        ...(dto.status && { status: dto.status }),
        ...(dto.tpHits && { tp_hits: dto.tpHits }),
        ...(dto.closeReason && { close_reason: dto.closeReason }),
        ...(dto.notes && { notes: dto.notes })
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return TradingMapper.toDomain(data);
  }

  async deleteAlert(id: string): Promise<void> {
    const { error } = await supabase
      .from('trade_alerts')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
}
