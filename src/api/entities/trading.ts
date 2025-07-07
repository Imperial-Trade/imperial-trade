
import { supabase } from '@/integrations/supabase/client';
import { BaseEntity } from '../base/BaseEntity';

export class TradeJournalEntry extends BaseEntity {
  static tableName = 'trade_journal_entries';
}

export class TradeAlert extends BaseEntity {
  static tableName = 'trade_alerts';

  static async getByStatus(status: 'pending' | 'active' | 'closed') {
    const { data, error } = await supabase
      .from('trade_alerts')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }
}

export class TradingStrategy extends BaseEntity {
  static tableName = 'trading_strategies';

  static async create(strategyData: any) {
    const { data, error } = await supabase
      .from('trading_strategies')
      .insert([{
        ...strategyData,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        created_by: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async getPublic() {
    const { data, error } = await supabase
      .from('trading_strategies')
      .select('*')
      .eq('is_public', true)
      .order('likes', { ascending: false });
    
    if (error) throw error;
    return data;
  }
}

export class TradingGroup extends BaseEntity {
  static tableName = 'trading_groups';

  static async create(groupData: any) {
    const { data, error } = await supabase
      .from('trading_groups')
      .insert([{
        ...groupData,
        created_by: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
}

export class GroupJournalEntry extends BaseEntity {
  static tableName = 'group_journal_entries';

  static async list(groupId: string) {
    const { data, error } = await supabase
      .from('group_journal_entries')
      .select('*')
      .eq('group_id', groupId)
      .order('shared_date', { ascending: false });
    
    if (error) throw error;
    return data;
  }
}

export class VerifiedTrader extends BaseEntity {
  static tableName = 'verified_traders';

  static async list(orderBy = '-total_pnl') {
    const { data, error } = await supabase
      .from('verified_traders')
      .select('*')
      .order(orderBy.replace('-', ''), { ascending: !orderBy.startsWith('-') });
    
    if (error) throw error;
    return data;
  }

  static async getByUserId(userId: string) {
    const { data, error } = await supabase
      .from('verified_traders')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) throw error;
    return data;
  }
}

export class TradeHistory extends BaseEntity {
  static tableName = 'trade_history';

  static async list(orderBy = '-upload_date') {
    const { data, error } = await supabase
      .from('trade_history')
      .select('*')
      .order(orderBy.replace('-', ''), { ascending: !orderBy.startsWith('-') });
    
    if (error) throw error;
    return data;
  }
}
