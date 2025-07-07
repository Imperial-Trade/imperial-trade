
import { supabase } from '@/integrations/supabase/client';

export class BaseEntity {
  static async getCurrentUserId(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    return user.id;
  }

  static async getCurrentUserEmail(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      throw new Error('User email not found');
    }
    return user.email;
  }

  static async genericList(tableName: string, orderBy: string = '-created_at') {
    const [direction, column] = orderBy.startsWith('-') 
      ? ['desc', orderBy.slice(1)] 
      : ['asc', orderBy];
    
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .order(column, { ascending: direction === 'asc' });
    
    if (error) throw error;
    return data;
  }

  static async genericCreate(tableName: string, createData: any) {
    const userId = await this.getCurrentUserId();
    const { data, error } = await supabase
      .from(tableName)
      .insert([{ ...createData, user_id: userId }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async genericGetById(tableName: string, id: string) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }
}
