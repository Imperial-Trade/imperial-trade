
import { supabase } from '@/integrations/supabase/client';
import { BaseEntity } from '../base/BaseEntity';

export class Quiz extends BaseEntity {
  static tableName = 'quizzes';

  static async getByVideoId(videoId: string) {
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('video_id', videoId)
      .single();
    
    if (error) throw error;
    return data;
  }
}

export class QuizAttempt extends BaseEntity {
  static tableName = 'quiz_attempts';

  static async create(attemptData: any) {
    const { data, error } = await supabase
      .from('quiz_attempts')
      .insert([{
        ...attemptData,
        user_id: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async getByQuizId(quizId: string) {
    const { data, error } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('quiz_id', quizId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }
}

export class UserProgress extends BaseEntity {
  static tableName = 'user_progress';

  static async list(orderBy = '-updated_at') {
    const { data, error } = await supabase
      .from('user_progress')
      .select('*')
      .order(orderBy.replace('-', ''), { ascending: !orderBy.startsWith('-') });
    
    if (error) throw error;
    return data;
  }

  static async create(progressData: any) {
    const { data, error } = await supabase
      .from('user_progress')
      .insert([{
        ...progressData,
        user_id: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async getByVideoId(videoId: string) {
    const { data, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('video_id', videoId)
      .single();
    
    if (error) throw error;
    return data;
  }
}

export class LearningPathway extends BaseEntity {
  static tableName = 'learning_pathways';

  static async getByDifficulty(level: 'beginner' | 'intermediate' | 'advanced') {
    const { data, error } = await supabase
      .from('learning_pathways')
      .select('*')
      .eq('difficulty_level', level)
      .order('completion_count', { ascending: false });
    
    if (error) throw error;
    return data;
  }
}

export class UserPathwayProgress extends BaseEntity {
  static tableName = 'user_pathway_progress';

  static async list(orderBy = '-started_date') {
    const { data, error } = await supabase
      .from('user_pathway_progress')
      .select('*')
      .order(orderBy.replace('-', ''), { ascending: !orderBy.startsWith('-') });
    
    if (error) throw error;
    return data;
  }

  static async create(progressData: any) {
    const { data, error } = await supabase
      .from('user_pathway_progress')
      .insert([{
        ...progressData,
        user_id: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async getByPathwayId(pathwayId: string) {
    const { data, error } = await supabase
      .from('user_pathway_progress')
      .select('*')
      .eq('pathway_id', pathwayId)
      .single();
    
    if (error) throw error;
    return data;
  }
}

export class Course extends BaseEntity {
  static tableName = 'courses';

  static async getByCategory(category: string) {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('category', category)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async getByDifficulty(difficulty: 'Beginner' | 'Intermediate' | 'Advanced') {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('difficulty', difficulty)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }
}
