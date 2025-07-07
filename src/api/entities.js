
import { supabase } from '@/integrations/supabase/client';

export class ForumPost {
  static async list(orderBy = '-created_at') {
    const { data, error } = await supabase
      .from('forum_posts')
      .select('*')
      .order(orderBy.replace('-', ''), { ascending: !orderBy.startsWith('-') });
    
    if (error) throw error;
    return data;
  }

  static async create(postData) {
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

  static async update(id, postData) {
    const { data, error } = await supabase
      .from('forum_posts')
      .update(postData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async delete(id) {
    const { error } = await supabase
      .from('forum_posts')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  static async getById(id) {
    const { data, error } = await supabase
      .from('forum_posts')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }
}

export class Reply {
  static async list(postId) {
    const { data, error } = await supabase
      .from('replies')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data;
  }

  static async create(replyData) {
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

  static async update(id, replyData) {
    const { data, error } = await supabase
      .from('replies')
      .update(replyData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async delete(id) {
    const { error } = await supabase
      .from('replies')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
}

export class PortfolioItem {
  static async list(orderBy = '-created_at') {
    const { data, error } = await supabase
      .from('portfolio_items')
      .select('*')
      .order(orderBy.replace('-', ''), { ascending: !orderBy.startsWith('-') });
    
    if (error) throw error;
    return data;
  }

  static async create(itemData) {
    const { data, error } = await supabase
      .from('portfolio_items')
      .insert([{
        ...itemData,
        user_id: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async update(id, itemData) {
    const { data, error } = await supabase
      .from('portfolio_items')
      .update(itemData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async delete(id) {
    const { error } = await supabase
      .from('portfolio_items')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  static async getById(id) {
    const { data, error } = await supabase
      .from('portfolio_items')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }
}

export class TradeJournalEntry {
  static async list(orderBy = '-created_at') {
    const { data, error } = await supabase
      .from('trade_journal_entries')
      .select('*')
      .order(orderBy.replace('-', ''), { ascending: !orderBy.startsWith('-') });
    
    if (error) throw error;
    return data;
  }

  static async create(entryData) {
    const { data, error } = await supabase
      .from('trade_journal_entries')
      .insert([{
        ...entryData,
        user_id: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async update(id, entryData) {
    const { data, error } = await supabase
      .from('trade_journal_entries')
      .update(entryData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async delete(id) {
    const { error } = await supabase
      .from('trade_journal_entries')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  static async getById(id) {
    const { data, error } = await supabase
      .from('trade_journal_entries')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }
}
