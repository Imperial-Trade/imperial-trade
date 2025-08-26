
import { Database } from '@/integrations/supabase/types';
import { TradeAlert } from '@/domain/entities/trading/TradeAlert';

type TradeAlertRow = Database['public']['Tables']['trade_alerts']['Row'];

export class TradingMapper {
  static toDomain(row: TradeAlertRow): TradeAlert {
    // Map database status to domain status, including partially_profited
    const status = row.status as 'pending' | 'active' | 'closed' | 'partially_profited';
    
    return new TradeAlert(
      row.id,
      row.asset_name,
      row.tradermade_symbol,
      row.trade_type,
      row.entry_price,
      row.stop_loss,
      row.user_id,
      status,
      row.tp1 || undefined,
      row.tp2 || undefined,
      row.tp3 || undefined,
      row.tp4 || undefined,
      row.tp5 || undefined,
      row.tp_hits || [],
      row.notes || undefined,
      row.close_reason || undefined,
      new Date(row.created_at),
      new Date(row.updated_at)
    );
  }
}
