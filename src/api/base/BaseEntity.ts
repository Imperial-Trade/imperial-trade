
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type TableName = keyof Database['public']['Tables'];
type TableRow<T extends TableName> = Database['public']['Tables'][T]['Row'];
type TableInsert<T extends TableName> = Database['public']['Tables'][T]['Insert'];
type TableUpdate<T extends TableName> = Database['public']['Tables'][T]['Update'];

export abstract class BaseEntity<T extends TableName> {
  static tableName: TableName;

  static async list<T extends TableName>(
    this: { tableName: T },
    orderBy = '-created_at'
  ): Promise<TableRow<T>[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .order(orderBy.replace('-', ''), { ascending: !orderBy.startsWith('-') });
    
    if (error) throw error;
    return data;
  }

  static async getById<T extends TableName>(
    this: { tableName: T },
    id: string
  ): Promise<TableRow<T>> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async create<T extends TableName>(
    this: { tableName: T },
    entityData: Partial<TableInsert<T>>
  ): Promise<TableRow<T>> {
    const { data, error } = await supabase
      .from(this.tableName)
      .insert([{
        ...entityData,
        user_id: (await supabase.auth.getUser()).data.user?.id
      } as TableInsert<T>])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async update<T extends TableName>(
    this: { tableName: T },
    id: string,
    entityData: Partial<TableUpdate<T>>
  ): Promise<TableRow<T>> {
    const { data, error } = await supabase
      .from(this.tableName)
      .update(entityData as TableUpdate<T>)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async delete<T extends TableName>(
    this: { tableName: T },
    id: string
  ): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
}
