
import { supabase } from '@/integrations/supabase/client';
import { IForumRepository } from '@/domain/interfaces/repositories/IForumRepository';
import { ForumPost } from '@/domain/entities/forum/ForumPost';
import { Reply } from '@/domain/entities/forum/Reply';
import { CreateForumPostDto, UpdateForumPostDto } from '@/domain/dtos/forum/CreateForumPostDto';
import { ForumMapper } from '../mappers/ForumMapper';

export class ForumRepository implements IForumRepository {
  async findAllPosts(): Promise<ForumPost[]> {
    const { data, error } = await supabase
      .from('forum_posts')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data.map(ForumMapper.toDomain);
  }

  async findPostById(id: string): Promise<ForumPost | null> {
    const { data, error } = await supabase
      .from('forum_posts')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    
    return ForumMapper.toDomain(data);
  }

  async createPost(dto: CreateForumPostDto, userId: string): Promise<ForumPost> {
    const { data, error } = await supabase
      .from('forum_posts')
      .insert([{
        title: dto.title,
        content: dto.content,
        category: dto.category,
        tags: dto.tags || [],
        user_id: userId
      }])
      .select()
      .single();
    
    if (error) throw error;
    return ForumMapper.toDomain(data);
  }

  async updatePost(id: string, dto: UpdateForumPostDto): Promise<ForumPost> {
    const { data, error } = await supabase
      .from('forum_posts')
      .update({
        ...(dto.title && { title: dto.title }),
        ...(dto.content && { content: dto.content }),
        ...(dto.category && { category: dto.category }),
        ...(dto.tags && { tags: dto.tags })
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return ForumMapper.toDomain(data);
  }

  async deletePost(id: string): Promise<void> {
    const { error } = await supabase
      .from('forum_posts')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  async findRepliesByPostId(postId: string): Promise<Reply[]> {
    const { data, error } = await supabase
      .from('replies')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data.map(ForumMapper.replyToDomain);
  }

  async createReply(postId: string, content: string, userId: string): Promise<Reply> {
    const { data, error } = await supabase
      .from('replies')
      .insert([{
        post_id: postId,
        content,
        user_id: userId
      }])
      .select()
      .single();
    
    if (error) throw error;
    return ForumMapper.replyToDomain(data);
  }

  async updateReply(id: string, content: string): Promise<Reply> {
    const { data, error } = await supabase
      .from('replies')
      .update({ content })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return ForumMapper.replyToDomain(data);
  }

  async deleteReply(id: string): Promise<void> {
    const { error } = await supabase
      .from('replies')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
}
