import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type PortfolioItemRow = Database['public']['Tables']['portfolio_items']['Row'];
type MarketAlertRow = Database['public']['Tables']['market_alerts']['Row'];
type OpportunitySignalRow = Database['public']['Tables']['opportunity_signals']['Row'];
type RiskSimulationRow = Database['public']['Tables']['risk_simulations']['Row'];

export class PortfolioItem {
  static tableName = 'portfolio_items' as const;

  static async list(orderBy = '-created_at'): Promise<PortfolioItemRow[]> {
    const { data, error } = await supabase
      .from('portfolio_items')
      .select('*')
      .order(orderBy.replace('-', ''), { ascending: !orderBy.startsWith('-') });
    
    if (error) throw error;
    return data;
  }

  static async getById(id: string): Promise<PortfolioItemRow> {
    const { data, error } = await supabase
      .from('portfolio_items')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async create(entityData: any): Promise<PortfolioItemRow> {
    const { data, error } = await supabase
      .from('portfolio_items')
      .insert([{
        ...entityData,
        user_id: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async update(id: string, entityData: any): Promise<PortfolioItemRow> {
    const { data, error } = await supabase
      .from('portfolio_items')
      .update(entityData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('portfolio_items')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
}

export class MarketAlert {
  static tableName = 'market_alerts' as const;

  static async list(orderBy = '-created_at'): Promise<MarketAlertRow[]> {
    const { data, error } = await supabase
      .from('market_alerts')
      .select('*')
      .order(orderBy.replace('-', ''), { ascending: !orderBy.startsWith('-') });
    
    if (error) throw error;
    return data;
  }

  static async getById(id: string): Promise<MarketAlertRow> {
    const { data, error } = await supabase
      .from('market_alerts')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async create(entityData: any): Promise<MarketAlertRow> {
    const { data, error } = await supabase
      .from('market_alerts')
      .insert([{
        ...entityData,
        user_id: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async update(id: string, entityData: any): Promise<MarketAlertRow> {
    const { data, error } = await supabase
      .from('market_alerts')
      .update(entityData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('market_alerts')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
}

export class OpportunitySignal {
  static tableName = 'opportunity_signals' as const;

  static async list(orderBy = '-created_at'): Promise<OpportunitySignalRow[]> {
    const { data, error } = await supabase
      .from('opportunity_signals')
      .select('*')
      .order(orderBy.replace('-', ''), { ascending: !orderBy.startsWith('-') });
    
    if (error) throw error;
    return data;
  }

  static async getById(id: string): Promise<OpportunitySignalRow> {
    const { data, error } = await supabase
      .from('opportunity_signals')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async create(entityData: any): Promise<OpportunitySignalRow> {
    const { data, error } = await supabase
      .from('opportunity_signals')
      .insert([{
        ...entityData,
        user_id: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async update(id: string, entityData: any): Promise<OpportunitySignalRow> {
    const { data, error } = await supabase
      .from('opportunity_signals')
      .update(entityData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('opportunity_signals')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
}

export class RiskSimulation {
  static tableName = 'risk_simulations' as const;

  static async list(orderBy = '-simulation_date'): Promise<RiskSimulationRow[]> {
    const { data, error } = await supabase
      .from('risk_simulations')
      .select('*')
      .order(orderBy.replace('-', ''), { ascending: !orderBy.startsWith('-') });
    
    if (error) throw error;
    return data;
  }

  static async getById(id: string): Promise<RiskSimulationRow> {
    const { data, error } = await supabase
      .from('risk_simulations')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async create(entityData: any): Promise<RiskSimulationRow> {
    const { data, error } = await supabase
      .from('risk_simulations')
      .insert([{
        ...entityData,
        user_id: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async update(id: string, entityData: any): Promise<RiskSimulationRow> {
    const { data, error } = await supabase
      .from('risk_simulations')
      .update(entityData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('risk_simulations')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
}
