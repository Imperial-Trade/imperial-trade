
import { Database } from '@/integrations/supabase/types';
import { PortfolioItem } from '@/domain/entities/portfolio/PortfolioItem';

type PortfolioItemRow = Database['public']['Tables']['portfolio_items']['Row'];

export class PortfolioMapper {
  static toDomain(row: PortfolioItemRow): PortfolioItem {
    return new PortfolioItem(
      row.id,
      row.asset_name,
      row.ticker,
      row.asset_type,
      Number(row.quantity),
      Number(row.avg_buy_price),
      row.user_id,
      new Date(row.created_at),
      new Date(row.updated_at)
    );
  }
}
