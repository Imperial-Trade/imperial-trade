
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
    return BaseEntity.genericList(this.tableName, orderBy);
  }

  static async create(postData: Partial<ForumPostInsert>): Promise<ForumPostRow> {
    return BaseEntity.genericCreate(this.tableName, postData);
  }

  static async getById(id: string): Promise<ForumPostRow> {
    return BaseEntity.genericGetById(this.tableName, id);
  }

  static async update(id: string, postData: Partial<ForumPostInsert>): Promise<ForumPostRow> {
    return BaseEntity.genericUpdate(this.tableName, id, postData);
  }

  static async delete(id: string): Promise<void> {
    return BaseEntity.genericDelete(this.tableName, id);
  }
}

export class Reply {
  static tableName = 'replies' as const;

  static async list(postId: string): Promise<ReplyRow[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data;
  }

  static async create(replyData: Partial<ReplyInsert>): Promise<ReplyRow> {
    return BaseEntity.genericCreate(this.tableName, replyData);
  }

  static async getById(id: string): Promise<ReplyRow> {
    return BaseEntity.genericGetById(this.tableName, id);
  }

  static async update(id: string, replyData: Partial<ReplyInsert>): Promise<ReplyRow> {
    return BaseEntity.genericUpdate(this.tableName, id, replyData);
  }

  static async delete(id: string): Promise<void> {
    return BaseEntity.genericDelete(this.tableName, id);
  }
}
