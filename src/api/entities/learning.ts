import { Container } from '@/infrastructure/di/Container';
import { supabase } from '@/integrations/supabase/client';

// Video entity for educational content
export class Video {
  static async list(sortOrder: string = '-created_date') {
    try {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .order('created_at', { ascending: sortOrder.startsWith('-') ? false : true });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching videos:', error);
      return [];
    }
  }

  static async getById(id: string) {
    try {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching video:', error);
      return null;
    }
  }

  static async create(videoData: any) {
    try {
      const { data, error } = await supabase
        .from('videos')
        .insert(videoData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating video:', error);
      throw error;
    }
  }

  static async update(id: string, videoData: any) {
    try {
      const { data, error } = await supabase
        .from('videos')
        .update(videoData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating video:', error);
      throw error;
    }
  }

  static async delete(id: string) {
    try {
      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting video:', error);
      throw error;
    }
  }
}

// Keep other classes as simple wrappers for now
export { Quiz, QuizAttempt, UserProgress, LearningPathway, UserPathwayProgress, Course } from '../base/BaseEntity';
