
import { supabase } from '@/integrations/supabase/client';
import { BaseEntity } from '../base/BaseEntity';

export class PortfolioItem extends BaseEntity {
  static tableName = 'portfolio_items';
}

export class MarketAlert extends BaseEntity {
  static tableName = 'market_alerts';
}

export class OpportunitySignal extends BaseEntity {
  static tableName = 'opportunity_signals';
}

export class RiskSimulation extends BaseEntity {
  static tableName = 'risk_simulations';

  static async list(orderBy = '-simulation_date') {
    const { data, error } = await supabase
      .from('risk_simulations')
      .select('*')
      .order(orderBy.replace('-', ''), { ascending: !orderBy.startsWith('-') });
    
    if (error) throw error;
    return data;
  }
}
