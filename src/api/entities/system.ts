
import { supabase } from '@/integrations/supabase/client';
import { BaseEntity } from '../base/BaseEntity';

export class EconomicEvent extends BaseEntity {
  static tableName = 'economic_events';

  static async list(orderBy = '-event_date') {
    const { data, error } = await supabase
      .from('economic_events')
      .select('*')
      .order(orderBy.replace('-', ''), { ascending: !orderBy.startsWith('-') });
    
    if (error) throw error;
    return data;
  }
}

export class PsychologyLog extends BaseEntity {
  static tableName = 'psychology_logs';

  static async list(orderBy = '-log_date') {
    const { data, error } = await supabase
      .from('psychology_logs')
      .select('*')
      .order(orderBy.replace('-', ''), { ascending: !orderBy.startsWith('-') });
    
    if (error) throw error;
    return data;
  }
}

export class LiveSession extends BaseEntity {
  static tableName = 'live_sessions';

  static async list(orderBy = '-session_date') {
    const { data, error } = await supabase
      .from('live_sessions')
      .select('*')
      .order(orderBy.replace('-', ''), { ascending: !orderBy.startsWith('-') });
    
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

export class AthenaInteraction extends BaseEntity {
  static tableName = 'athena_interactions';

  static async list(orderBy = '-interaction_time') {
    const { data, error } = await supabase
      .from('athena_interactions')
      .select('*')
      .order(orderBy.replace('-', ''), { ascending: !orderBy.startsWith('-') });
    
    if (error) throw error;
    return data;
  }

  static async create(interactionData: any) {
    const { data, error } = await supabase
      .from('athena_interactions')
      .insert([{
        ...interactionData,
        user_id: (await supabase.auth.getUser()).data.user?.id
      }])
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
