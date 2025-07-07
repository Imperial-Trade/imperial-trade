
import { supabase } from '@/integrations/supabase/client';
import { BaseEntity } from '../base/BaseEntity';

export class EconomicEvent {
  static tableName = 'economic_events' as const;

  static async list(orderBy = '-event_date') {
    const [direction, column] = orderBy.startsWith('-') 
      ? ['desc', orderBy.slice(1)] 
      : ['asc', orderBy];
    
    const { data, error } = await supabase
      .from('economic_events')
      .select('*')
      .order(column, { ascending: direction === 'asc' });
    
    if (error) throw error;
    return data;
  }
}

export class PsychologyLog {
  static tableName = 'psychology_logs' as const;

  static async list(orderBy = '-log_date') {
    const [direction, column] = orderBy.startsWith('-') 
      ? ['desc', orderBy.slice(1)] 
      : ['asc', orderBy];
    
    const { data, error } = await supabase
      .from('psychology_logs')
      .select('*')
      .order(column, { ascending: direction === 'asc' });
    
    if (error) throw error;
    return data;
  }
}

export class LiveSession {
  static tableName = 'live_sessions' as const;

  static async list(orderBy = '-session_date') {
    const [direction, column] = orderBy.startsWith('-') 
      ? ['desc', orderBy.slice(1)] 
      : ['asc', orderBy];
    
    const { data, error } = await supabase
      .from('live_sessions')
      .select('*')
      .order(column, { ascending: direction === 'asc' });
    
    if (error) throw error;
    return data;
  }

  static async getUpcoming() {
    const { data, error } = await supabase
      .from('live_sessions')
      .select('*')
      .gte('session_date', new Date().toISOString())
      .eq('status', 'scheduled')
      .order('session_date', { ascending: true });
    
    if (error) throw error;
    return data;
  }
}

export class AthenaInteraction {
  static tableName = 'athena_interactions' as const;

  static async list(orderBy = '-interaction_time') {
    const [direction, column] = orderBy.startsWith('-') 
      ? ['desc', orderBy.slice(1)] 
      : ['asc', orderBy];
    
    const { data, error } = await supabase
      .from('athena_interactions')
      .select('*')
      .order(column, { ascending: direction === 'asc' });
    
    if (error) throw error;
    return data;
  }

  static async create(interactionData: any) {
    const userId = await BaseEntity.getCurrentUserId();
    const userEmail = await BaseEntity.getCurrentUserEmail();
    
    const { data, error } = await supabase
      .from('athena_interactions')
      .insert([{ ...interactionData, user_id: userId, user_email: userEmail }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async getByUserEmail(userEmail: string) {
    const { data, error } = await supabase
      .from('athena_interactions')
      .select('*')
      .eq('user_email', userEmail)
      .order('interaction_time', { ascending: false });
    
    if (error) throw error;
    return data;
  }
}
