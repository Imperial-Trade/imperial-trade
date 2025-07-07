
import { supabase } from '@/integrations/supabase/client';

// Simple utility class without complex inheritance
export class BaseEntity {
  // Helper method to get current user ID
  static async getCurrentUserId(): Promise<string | undefined> {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id;
  }

  // Simple utility methods for common operations
  static async executeQuery<T>(queryBuilder: any): Promise<T[]> {
    const { data, error } = await queryBuilder;
    if (error) throw error;
    return data || [];
  }

  static async executeSingleQuery<T>(queryBuilder: any): Promise<T> {
    const { data, error } = await queryBuilder;
    if (error) throw error;
    return data;
  }
}

// Legacy classes for backward compatibility - these will use direct Supabase calls
export class TradeJournalEntry {
  static async list() {
    const { data, error } = await supabase
      .from('trade_journal_entries')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async getById(id: string) {
    const { data, error } = await supabase
      .from('trade_journal_entries')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async create(entityData: any) {
    const userId = await BaseEntity.getCurrentUserId();
    const { data, error } = await supabase
      .from('trade_journal_entries')
      .insert([{ ...entityData, user_id: userId }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async update(id: string, entityData: any) {
    const { data, error } = await supabase
      .from('trade_journal_entries')
      .update(entityData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async delete(id: string) {
    const { error } = await supabase
      .from('trade_journal_entries')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
}

export class TradingStrategy {
  static async list() {
    const { data, error } = await supabase
      .from('trading_strategies')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async getById(id: string) {
    const { data, error } = await supabase
      .from('trading_strategies')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async create(entityData: any) {
    const userId = await BaseEntity.getCurrentUserId();
    const { data, error } = await supabase
      .from('trading_strategies')
      .insert([{ ...entityData, user_id: userId, created_by: userId }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async update(id: string, entityData: any) {
    const { data, error } = await supabase
      .from('trading_strategies')
      .update(entityData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async delete(id: string) {
    const { error } = await supabase
      .from('trading_strategies')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
}

export class TradingGroup {
  static async list() {
    const { data, error } = await supabase
      .from('trading_groups')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async getById(id: string) {
    const { data, error } = await supabase
      .from('trading_groups')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async create(entityData: any) {
    const userId = await BaseEntity.getCurrentUserId();
    const { data, error } = await supabase
      .from('trading_groups')
      .insert([{ ...entityData, created_by: userId }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async update(id: string, entityData: any) {
    const { data, error } = await supabase
      .from('trading_groups')
      .update(entityData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async delete(id: string) {
    const { error } = await supabase
      .from('trading_groups')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
}

export class GroupJournalEntry {
  static async list() {
    const { data, error } = await supabase
      .from('group_journal_entries')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async getById(id: string) {
    const { data, error } = await supabase
      .from('group_journal_entries')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async create(entityData: any) {
    const userId = await BaseEntity.getCurrentUserId();
    const { data, error } = await supabase
      .from('group_journal_entries')
      .insert([{ ...entityData, user_id: userId }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async update(id: string, entityData: any) {
    const { data, error } = await supabase
      .from('group_journal_entries')
      .update(entityData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async delete(id: string) {
    const { error } = await supabase
      .from('group_journal_entries')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
}

export class VerifiedTrader {
  static async list() {
    const { data, error } = await supabase
      .from('verified_traders')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async getById(id: string) {
    const { data, error } = await supabase
      .from('verified_traders')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async create(entityData: any) {
    const userId = await BaseEntity.getCurrentUserId();
    const { data, error } = await supabase
      .from('verified_traders')
      .insert([{ ...entityData, user_id: userId }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async update(id: string, entityData: any) {
    const { data, error } = await supabase
      .from('verified_traders')
      .update(entityData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async delete(id: string) {
    const { error } = await supabase
      .from('verified_traders')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
}

export class TradeHistory {
  static async list() {
    const { data, error } = await supabase
      .from('trade_history')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async getById(id: string) {
    const { data, error } = await supabase
      .from('trade_history')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async create(entityData: any) {
    const userId = await BaseEntity.getCurrentUserId();
    const { data, error } = await supabase
      .from('trade_history')
      .insert([{ ...entityData, user_id: userId }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async update(id: string, entityData: any) {
    const { data, error } = await supabase
      .from('trade_history')
      .update(entityData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async delete(id: string) {
    const { error } = await supabase
      .from('trade_history')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
}

export class MarketAlert {
  static async list() {
    const { data, error } = await supabase
      .from('market_alerts')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async getById(id: string) {
    const { data, error } = await supabase
      .from('market_alerts')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async create(entityData: any) {
    const userId = await BaseEntity.getCurrentUserId();
    const { data, error } = await supabase
      .from('market_alerts')
      .insert([{ ...entityData, user_id: userId }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async update(id: string, entityData: any) {
    const { data, error } = await supabase
      .from('market_alerts')
      .update(entityData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async delete(id: string) {
    const { error } = await supabase
      .from('market_alerts')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
}

export class OpportunitySignal {
  static async list() {
    const { data, error } = await supabase
      .from('opportunity_signals')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async getById(id: string) {
    const { data, error } = await supabase
      .from('opportunity_signals')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async create(entityData: any) {
    const userId = await BaseEntity.getCurrentUserId();
    const { data, error } = await supabase
      .from('opportunity_signals')
      .insert([{ ...entityData, user_id: userId }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async update(id: string, entityData: any) {
    const { data, error } = await supabase
      .from('opportunity_signals')
      .update(entityData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async delete(id: string) {
    const { error } = await supabase
      .from('opportunity_signals')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
}

export class RiskSimulation {
  static async list() {
    const { data, error } = await supabase
      .from('risk_simulations')
      .select('*')
      .order('simulation_date', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async getById(id: string) {
    const { data, error } = await supabase
      .from('risk_simulations')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async create(entityData: any) {
    const userId = await BaseEntity.getCurrentUserId();
    const { data, error } = await supabase
      .from('risk_simulations')
      .insert([{ ...entityData, user_id: userId }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async update(id: string, entityData: any) {
    const { data, error } = await supabase
      .from('risk_simulations')
      .update(entityData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async delete(id: string) {
    const { error } = await supabase
      .from('risk_simulations')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
}
