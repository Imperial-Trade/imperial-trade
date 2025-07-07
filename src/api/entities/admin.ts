
import { supabase } from '@/integrations/supabase/client';
import { BaseEntity } from '../base/BaseEntity';

export class AccountRequest extends BaseEntity {
  static tableName = 'account_requests';

  static async create(requestData: any) {
    const { data, error } = await supabase
      .from('account_requests')
      .insert([requestData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async getByStatus(status: string) {
    const { data, error } = await supabase
      .from('account_requests')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }
}

export class AuditLog extends BaseEntity {
  static tableName = 'audit_logs';

  static async create(logData: any) {
    const { data, error } = await supabase
      .from('audit_logs')
      .insert([logData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async getByAdminEmail(adminEmail: string) {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('admin_email', adminEmail)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async getByTargetEntity(targetEntity: string) {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('target_entity', targetEntity)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }
}
