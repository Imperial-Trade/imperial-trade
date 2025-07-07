
import { supabase } from '@/integrations/supabase/client';
import { BaseEntity } from '../base/BaseEntity';
import { Database } from '@/integrations/supabase/types';

type AccountRequestRow = Database['public']['Tables']['account_requests']['Row'];
type AccountRequestInsert = Database['public']['Tables']['account_requests']['Insert'];
type AuditLogRow = Database['public']['Tables']['audit_logs']['Row'];
type AuditLogInsert = Database['public']['Tables']['audit_logs']['Insert'];

export class AccountRequest {
  static tableName = 'account_requests' as const;

  static async create(requestData: Partial<AccountRequestInsert>): Promise<AccountRequestRow> {
    const { data, error } = await supabase
      .from(this.tableName)
      .insert([requestData as AccountRequestInsert])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async getByStatus(status: 'pending' | 'approved' | 'rejected'): Promise<AccountRequestRow[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async list(orderBy = '-created_at'): Promise<AccountRequestRow[]> {
    return BaseEntity.genericList(this.tableName, orderBy);
  }

  static async getById(id: string): Promise<AccountRequestRow> {
    return BaseEntity.genericGetById(this.tableName, id);
  }

  static async update(id: string, requestData: Partial<AccountRequestInsert>): Promise<AccountRequestRow> {
    return BaseEntity.genericUpdate(this.tableName, id, requestData);
  }

  static async delete(id: string): Promise<void> {
    return BaseEntity.genericDelete(this.tableName, id);
  }
}

export class AuditLog {
  static tableName = 'audit_logs' as const;

  static async create(logData: Partial<AuditLogInsert>): Promise<AuditLogRow> {
    const { data, error } = await supabase
      .from(this.tableName)
      .insert([logData as AuditLogInsert])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async getByAdminEmail(adminEmail: string): Promise<AuditLogRow[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('admin_email', adminEmail)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async getByTargetEntity(targetEntity: string): Promise<AuditLogRow[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('target_entity', targetEntity)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async list(orderBy = '-created_at'): Promise<AuditLogRow[]> {
    return BaseEntity.genericList(this.tableName, orderBy);
  }

  static async getById(id: string): Promise<AuditLogRow> {
    return BaseEntity.genericGetById(this.tableName, id);
  }

  static async update(id: string, logData: Partial<AuditLogInsert>): Promise<AuditLogRow> {
    return BaseEntity.genericUpdate(this.tableName, id, logData);
  }

  static async delete(id: string): Promise<void> {
    return BaseEntity.genericDelete(this.tableName, id);
  }
}
