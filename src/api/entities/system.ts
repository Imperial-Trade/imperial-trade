import { supabase } from '@/integrations/supabase/client';
import { BaseEntity } from '../base/BaseEntity';

export class EconomicEvent {
  static tableName = 'economic_events' as const;

  static async list(orderBy = '-event_date') {
    return BaseEntity.genericList(this.tableName, orderBy);
  }
}

export class PsychologyLog {
  static tableName = 'psychology_logs' as const;

  static async list(orderBy = '-log_date') {
    return BaseEntity.genericList(this.tableName, orderBy);
  }
}

export class LiveSession {
  static tableName = 'live_sessions' as const;

  static async list(orderBy = '-session_date') {
    return BaseEntity.genericList(this.tableName, orderBy);
  }

  static async getUpcoming() {
    const { data, error } = await supabase
      .from(this.tableName)
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
    return BaseEntity.genericList(this.tableName, orderBy);
  }

  static async create(interactionData: any) {
    return BaseEntity.genericCreate(this.tableName, interactionData);
  }

  static async getByUserEmail(userEmail: string) {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('user_email', userEmail)
      .order('interaction_time', { ascending: false });
    
    if (error) throw error;
    return data;
  }
}
