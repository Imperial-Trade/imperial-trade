
import { supabase } from '@/integrations/supabase/client';
import { BaseEntity } from '../base/BaseEntity';

export class ForumPost extends BaseEntity {
  static tableName = 'forum_posts';

  static async list(orderBy = '-created_at') {
    const { data, error } = await supabase
      .from('forum_posts')
      .select('*')
      .order(orderBy.replace('-', ''), { ascending: !orderBy.startsWith('-') });
    
    if (error) throw error;
    return data;
  }

  static async create(postData: any) {
    const { data, error } = await supabase
      .from('forum_posts')
      .insert([{
        ...postData,
        user_id: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
}

export class Reply extends BaseEntity {
  static tableName = 'replies';

  static async list(postId: string) {
    const { data, error } = await supabase
      .from('replies')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data;
  }

  static async create(replyData: any) {
    const { data, error } = await supabase
      .from('replies')
      .insert([{
        ...replyData,
        user_id: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
}
