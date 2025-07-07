
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type AccountRequestRow = Database['public']['Tables']['account_requests']['Row'];
type AccountRequestInsert = Database['public']['Tables']['account_requests']['Insert'];
type AuditLogRow = Database['public']['Tables']['audit_logs']['Row'];
type AuditLogInsert = Database['public']['Tables']['audit_logs']['Insert'];

export class AccountRequest {
  static tableName = 'account_requests' as const;

  static async create(requestData: Partial<AccountRequestInsert>): Promise<AccountRequestRow> {
    const { data, error } = await supabase
      .from('account_requests')
      .insert([requestData as AccountRequestInsert])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async getByStatus(status: 'pending' | 'approved' | 'rejected'): Promise<AccountRequestRow[]> {
    const { data, error } = await supabase
      .from('account_requests')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async list(orderBy = '-created_at'): Promise<AccountRequestRow[]> {
    const { data, error } = await supabase
      .from('account_requests')
      .select('*')
      .order(orderBy.replace('-', ''), { ascending: !orderBy.startsWith('-') });
    
    if (error) throw error;
    return data;
  }

  static async getById(id: string): Promise<AccountRequestRow> {
    const { data, error } = await supabase
      .from('account_requests')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async update(id: string, requestData: Partial<AccountRequestInsert>): Promise<AccountRequestRow> {
    const { data, error } = await supabase
      .from('account_requests')
      .update(requestData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('account_requests')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
}

export class AuditLog {
  static tableName = 'audit_logs' as const;

  static async create(logData: Partial<AuditLogInsert>): Promise<AuditLogRow> {
    const { data, error } = await supabase
      .from('audit_logs')
      .insert([logData as AuditLogInsert])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async getByAdminEmail(adminEmail: string): Promise<AuditLogRow[]> {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('admin_email', adminEmail)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async getByTargetEntity(targetEntity: string): Promise<AuditLogRow[]> {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('target_entity', targetEntity)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async list(orderBy = '-created_at'): Promise<AuditLogRow[]> {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order(orderBy.replace('-', ''), { ascending: !orderBy.startsWith('-') });
    
    if (error) throw error;
    return data;
  }

  static async getById(id: string): Promise<AuditLogRow> {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async update(id: string, logData: Partial<AuditLogInsert>): Promise<AuditLogRow> {
    const { data, error } = await supabase
      .from('audit_logs')
      .update(logData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('audit_logs')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
}
