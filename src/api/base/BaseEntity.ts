
import { supabase } from '@/integrations/supabase/client';

export abstract class BaseEntity {
  static tableName: string;

  static async list(orderBy = '-created_at') {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .order(orderBy.replace('-', ''), { ascending: !orderBy.startsWith('-') });
    
    if (error) throw error;
    return data;
  }

  static async getById(id: string) {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async create(entityData: any) {
    const { data, error } = await supabase
      .from(this.tableName)
      .insert([{
        ...entityData,
        user_id: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async update(id: string, entityData: any) {
    const { data, error } = await supabase
      .from(this.tableName)
      .update(entityData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async delete(id: string) {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
}
