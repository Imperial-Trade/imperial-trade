
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type TableName = keyof Database['public']['Tables'];
type TableRow<T extends TableName> = Database['public']['Tables'][T]['Row'];
type TableInsert<T extends TableName> = Database['public']['Tables'][T]['Insert'];
type TableUpdate<T extends TableName> = Database['public']['Tables'][T]['Update'];

// Simple utility class without complex inheritance
export class BaseEntity {
  // Generic utility methods that can be used by any entity
  static async executeQuery<T>(queryBuilder: any): Promise<T[]> {
    const { data, error } = await queryBuilder;
    if (error) throw error;
    return data || [];
  }

  static async executeSingleQuery<T>(queryBuilder: any): Promise<T> {
    const { data, error } = await queryBuilder;
    if (error) throw error;
    return data;
  }

  // Helper method to get current user ID
  static async getCurrentUserId(): Promise<string | undefined> {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id;
  }

  // Generic list method
  static async genericList<T extends TableName>(
    tableName: T,
    orderBy = '-created_at'
  ): Promise<TableRow<T>[]> {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .order(orderBy.replace('-', ''), { ascending: !orderBy.startsWith('-') });
    
    if (error) throw error;
    return data as TableRow<T>[];
  }

  // Generic getById method
  static async genericGetById<T extends TableName>(
    tableName: T,
    id: string
  ): Promise<TableRow<T>> {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data as TableRow<T>;
  }

  // Generic create method
  static async genericCreate<T extends TableName>(
    tableName: T,
    entityData: Partial<TableInsert<T>>
  ): Promise<TableRow<T>> {
    const userId = await this.getCurrentUserId();
    const { data, error } = await supabase
      .from(tableName)
      .insert([{
        ...entityData,
        ...(userId && { user_id: userId })
      } as TableInsert<T>])
      .select()
      .single();
    
    if (error) throw error;
    return data as TableRow<T>;
  }

  // Generic update method
  static async genericUpdate<T extends TableName>(
    tableName: T,
    id: string,
    entityData: Partial<TableUpdate<T>>
  ): Promise<TableRow<T>> {
    const { data, error } = await supabase
      .from(tableName)
      .update(entityData as TableUpdate<T>)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as TableRow<T>;
  }

  // Generic delete method
  static async genericDelete<T extends TableName>(
    tableName: T,
    id: string
  ): Promise<void> {
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
}
