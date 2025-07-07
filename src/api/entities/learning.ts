
import { supabase } from '@/integrations/supabase/client';
import { BaseEntity } from '../base/BaseEntity';
import { Database } from '@/integrations/supabase/types';

type QuizRow = Database['public']['Tables']['quizzes']['Row'];
type QuizAttemptRow = Database['public']['Tables']['quiz_attempts']['Row'];
type QuizAttemptInsert = Database['public']['Tables']['quiz_attempts']['Insert'];
type UserProgressRow = Database['public']['Tables']['user_progress']['Row'];
type UserProgressInsert = Database['public']['Tables']['user_progress']['Insert'];
type LearningPathwayRow = Database['public']['Tables']['learning_pathways']['Row'];
type UserPathwayProgressRow = Database['public']['Tables']['user_pathway_progress']['Row'];
type UserPathwayProgressInsert = Database['public']['Tables']['user_pathway_progress']['Insert'];
type CourseRow = Database['public']['Tables']['courses']['Row'];

export class Quiz {
  static async getByVideoId(videoId: string): Promise<QuizRow> {
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('video_id', videoId)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async list(): Promise<QuizRow[]> {
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async getById(id: string): Promise<QuizRow> {
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }
}

export class QuizAttempt {
  static async create(attemptData: Partial<QuizAttemptInsert>): Promise<QuizAttemptRow> {
    const userId = await BaseEntity.getCurrentUserId();
    const userEmail = await BaseEntity.getCurrentUserEmail();
    
    // Ensure all required properties are present
    const insertData: QuizAttemptInsert = {
      user_id: userId,
      user_email: userEmail,
      quiz_id: attemptData.quiz_id || '',
      answers: attemptData.answers || {},
      score: attemptData.score || 0,
      ...attemptData
    };

    const { data, error } = await supabase
      .from('quiz_attempts')
      .insert(insertData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async getByQuizId(quizId: string): Promise<QuizAttemptRow[]> {
    const { data, error } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('quiz_id', quizId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async list(): Promise<QuizAttemptRow[]> {
    const { data, error } = await supabase
      .from('quiz_attempts')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async getById(id: string): Promise<QuizAttemptRow> {
    const { data, error } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }
}

export class UserProgress {
  static async list(): Promise<UserProgressRow[]> {
    const { data, error } = await supabase
      .from('user_progress')
      .select('*')
      .order('updated_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async create(progressData: Partial<UserProgressInsert>): Promise<UserProgressRow> {
    const userId = await BaseEntity.getCurrentUserId();
    const userEmail = await BaseEntity.getCurrentUserEmail();
    
    // Ensure all required properties are present
    const insertData: UserProgressInsert = {
      user_id: userId,
      user_email: userEmail,
      video_id: progressData.video_id || '',
      status: progressData.status || 'in_progress',
      ...progressData
    };

    const { data, error } = await supabase
      .from('user_progress')
      .insert(insertData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async getByVideoId(videoId: string): Promise<UserProgressRow> {
    const { data, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('video_id', videoId)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async getById(id: string): Promise<UserProgressRow> {
    const { data, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }
}

export class LearningPathway {
  static async getByDifficulty(level: 'beginner' | 'intermediate' | 'advanced'): Promise<LearningPathwayRow[]> {
    const { data, error } = await supabase
      .from('learning_pathways')
      .select('*')
      .eq('difficulty_level', level)
      .order('completion_count', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async list(): Promise<LearningPathwayRow[]> {
    const { data, error } = await supabase
      .from('learning_pathways')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async getById(id: string): Promise<LearningPathwayRow> {
    const { data, error } = await supabase
      .from('learning_pathways')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }
}

export class UserPathwayProgress {
  static async list(): Promise<UserPathwayProgressRow[]> {
    const { data, error } = await supabase
      .from('user_pathway_progress')
      .select('*')
      .order('started_date', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async create(progressData: Partial<UserPathwayProgressInsert>): Promise<UserPathwayProgressRow> {
    const userId = await BaseEntity.getCurrentUserId();
    const userEmail = await BaseEntity.getCurrentUserEmail();
    
    // Ensure all required properties are present
    const insertData: UserPathwayProgressInsert = {
      user_id: userId,
      user_email: userEmail,
      pathway_id: progressData.pathway_id || '',
      ...progressData
    };

    const { data, error } = await supabase
      .from('user_pathway_progress')
      .insert(insertData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async getByPathwayId(pathwayId: string): Promise<UserPathwayProgressRow> {
    const { data, error } = await supabase
      .from('user_pathway_progress')
      .select('*')
      .eq('pathway_id', pathwayId)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async getById(id: string): Promise<UserPathwayProgressRow> {
    const { data, error } = await supabase
      .from('user_pathway_progress')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }
}

export class Course {
  static async getByCategory(category: string): Promise<CourseRow[]> {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('category', category)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async getByDifficulty(difficulty: 'Beginner' | 'Intermediate' | 'Advanced'): Promise<CourseRow[]> {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('difficulty', difficulty)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async list(): Promise<CourseRow[]> {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async getById(id: string): Promise<CourseRow> {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }
}
