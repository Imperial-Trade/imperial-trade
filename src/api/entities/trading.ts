
import { supabase } from '@/integrations/supabase/client';
import { BaseEntity } from '../base/BaseEntity';
import { Database } from '@/integrations/supabase/types';

type TradeJournalEntryRow = Database['public']['Tables']['trade_journal_entries']['Row'];
type TradeAlertRow = Database['public']['Tables']['trade_alerts']['Row'];
type TradingStrategyRow = Database['public']['Tables']['trading_strategies']['Row'];
type TradingGroupRow = Database['public']['Tables']['trading_groups']['Row'];
type GroupJournalEntryRow = Database['public']['Tables']['group_journal_entries']['Row'];
type VerifiedTraderRow = Database['public']['Tables']['verified_traders']['Row'];
type TradeHistoryRow = Database['public']['Tables']['trade_history']['Row'];

export class TradeJournalEntry {
  static tableName = 'trade_journal_entries' as const;

  static async list(orderBy = '-created_at'): Promise<TradeJournalEntryRow[]> {
    return BaseEntity.genericList(this.tableName, orderBy);
  }

  static async getById(id: string): Promise<TradeJournalEntryRow> {
    return BaseEntity.genericGetById(this.tableName, id);
  }

  static async create(entityData: any): Promise<TradeJournalEntryRow> {
    return BaseEntity.genericCreate(this.tableName, entityData);
  }

  static async update(id: string, entityData: any): Promise<TradeJournalEntryRow> {
    return BaseEntity.genericUpdate(this.tableName, id, entityData);
  }

  static async delete(id: string): Promise<void> {
    return BaseEntity.genericDelete(this.tableName, id);
  }
}

export class TradeAlert {
  static tableName = 'trade_alerts' as const;

  static async getByStatus(status: 'pending' | 'active' | 'closed'): Promise<TradeAlertRow[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async list(orderBy = '-created_at'): Promise<TradeAlertRow[]> {
    return BaseEntity.genericList(this.tableName, orderBy);
  }

  static async getById(id: string): Promise<TradeAlertRow> {
    return BaseEntity.genericGetById(this.tableName, id);
  }

  static async create(entityData: any): Promise<TradeAlertRow> {
    return BaseEntity.genericCreate(this.tableName, entityData);
  }

  static async update(id: string, entityData: any): Promise<TradeAlertRow> {
    return BaseEntity.genericUpdate(this.tableName, id, entityData);
  }

  static async delete(id: string): Promise<void> {
    return BaseEntity.genericDelete(this.tableName, id);
  }
}

export class TradingStrategy {
  static tableName = 'trading_strategies' as const;

  static async list(orderBy = '-created_at'): Promise<TradingStrategyRow[]> {
    return BaseEntity.genericList(this.tableName, orderBy);
  }

  static async getById(id: string): Promise<TradingStrategyRow> {
    return BaseEntity.genericGetById(this.tableName, id);
  }

  static async create(entityData: any): Promise<TradingStrategyRow> {
    return BaseEntity.genericCreate(this.tableName, entityData);
  }

  static async update(id: string, entityData: any): Promise<TradingStrategyRow> {
    return BaseEntity.genericUpdate(this.tableName, id, entityData);
  }

  static async delete(id: string): Promise<void> {
    return BaseEntity.genericDelete(this.tableName, id);
  }
}

export class TradingGroup {
  static tableName = 'trading_groups' as const;

  static async list(orderBy = '-created_at'): Promise<TradingGroupRow[]> {
    return BaseEntity.genericList(this.tableName, orderBy);
  }

  static async getById(id: string): Promise<TradingGroupRow> {
    return BaseEntity.genericGetById(this.tableName, id);
  }

  static async create(entityData: any): Promise<TradingGroupRow> {
    const userId = await BaseEntity.getCurrentUserId();
    const { data, error } = await supabase
      .from(this.tableName)
      .insert([{
        ...entityData,
        created_by: userId
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async update(id: string, entityData: any): Promise<TradingGroupRow> {
    return BaseEntity.genericUpdate(this.tableName, id, entityData);
  }

  static async delete(id: string): Promise<void> {
    return BaseEntity.genericDelete(this.tableName, id);
  }
}

export class GroupJournalEntry {
  static tableName = 'group_journal_entries' as const;

  static async list(orderBy = '-created_at'): Promise<GroupJournalEntryRow[]> {
    return BaseEntity.genericList(this.tableName, orderBy);
  }

  static async getById(id: string): Promise<GroupJournalEntryRow> {
    return BaseEntity.genericGetById(this.tableName, id);
  }

  static async create(entityData: any): Promise<GroupJournalEntryRow> {
    return BaseEntity.genericCreate(this.tableName, entityData);
  }

  static async update(id: string, entityData: any): Promise<GroupJournalEntryRow> {
    return BaseEntity.genericUpdate(this.tableName, id, entityData);
  }

  static async delete(id: string): Promise<void> {
    return BaseEntity.genericDelete(this.tableName, id);
  }
}

export class VerifiedTrader {
  static tableName = 'verified_traders' as const;

  static async list(orderBy = '-created_at'): Promise<VerifiedTraderRow[]> {
    return BaseEntity.genericList(this.tableName, orderBy);
  }

  static async getById(id: string): Promise<VerifiedTraderRow> {
    return BaseEntity.genericGetById(this.tableName, id);
  }

  static async create(entityData: any): Promise<VerifiedTraderRow> {
    return BaseEntity.genericCreate(this.tableName, entityData);
  }

  static async update(id: string, entityData: any): Promise<VerifiedTraderRow> {
    return BaseEntity.genericUpdate(this.tableName, id, entityData);
  }

  static async delete(id: string): Promise<void> {
    return BaseEntity.genericDelete(this.tableName, id);
  }
}

export class TradeHistory {
  static tableName = 'trade_history' as const;

  static async list(orderBy = '-created_at'): Promise<TradeHistoryRow[]> {
    return BaseEntity.genericList(this.tableName, orderBy);
  }

  static async getById(id: string): Promise<TradeHistoryRow> {
    return BaseEntity.genericGetById(this.tableName, id);
  }

  static async create(entityData: any): Promise<TradeHistoryRow> {
    return BaseEntity.genericCreate(this.tableName, entityData);
  }

  static async update(id: string, entityData: any): Promise<TradeHistoryRow> {
    return BaseEntity.genericUpdate(this.tableName, id, entityData);
  }

  static async delete(id: string): Promise<void> {
    return BaseEntity.genericDelete(this.tableName, id);
  }
}
