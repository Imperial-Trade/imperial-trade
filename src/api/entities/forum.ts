
import { supabase } from '@/integrations/supabase/client';
import { BaseEntity } from '../base/BaseEntity';
import { Database } from '@/integrations/supabase/types';

type ForumPostRow = Database['public']['Tables']['forum_posts']['Row'];
type ForumPostInsert = Database['public']['Tables']['forum_posts']['Insert'];
type ReplyRow = Database['public']['Tables']['replies']['Row'];
type ReplyInsert = Database['public']['Tables']['replies']['Insert'];

export class ForumPost {
  static tableName = 'forum_posts' as const;

  static async list(orderBy = '-created_at'): Promise<ForumPostRow[]> {
    const { data, error } = await supabase
      .from('forum_posts')
      .select('*')
      .order(orderBy.replace('-', ''), { ascending: !orderBy.startsWith('-') });
    
    if (error) throw error;
    return data;
  }

  static async create(postData: Partial<ForumPostInsert>): Promise<ForumPostRow> {
    const { data, error } = await supabase
      .from('forum_posts')
      .insert([{
        ...postData,
        user_id: (await supabase.auth.getUser()).data.user?.id
      } as ForumPostInsert])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async getById(id: string): Promise<ForumPostRow> {
    const { data, error } = await supabase
      .from('forum_posts')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async update(id: string, postData: Partial<ForumPostInsert>): Promise<ForumPostRow> {
    const { data, error } = await supabase
      .from('forum_posts')
      .update(postData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('forum_posts')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
}

export class Reply {
  static tableName = 'replies' as const;

  static async list(postId: string): Promise<ReplyRow[]> {
    const { data, error } = await supabase
      .from('replies')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data;
  }

  static async create(replyData: Partial<ReplyInsert>): Promise<ReplyRow> {
    const { data, error } = await supabase
      .from('replies')
      .insert([{
        ...replyData,
        user_id: (await supabase.auth.getUser()).data.user?.id
      } as ReplyInsert])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async getById(id: string): Promise<ReplyRow> {
    const { data, error } = await supabase
      .from('replies')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async update(id: string, replyData: Partial<ReplyInsert>): Promise<ReplyRow> {
    const { data, error } = await supabase
      .from('replies')
      .update(replyData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('replies')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
}
