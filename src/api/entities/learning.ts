import { supabase } from '@/integrations/supabase/client';
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
  static tableName = 'quizzes' as const;

  static async getByVideoId(videoId: string): Promise<QuizRow> {
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('video_id', videoId)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async list(orderBy = '-created_at'): Promise<QuizRow[]> {
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .order(orderBy.replace('-', ''), { ascending: !orderBy.startsWith('-') });
    
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

  static async create(entityData: any): Promise<QuizRow> {
    const { data, error } = await supabase
      .from('quizzes')
      .insert([{
        ...entityData,
        user_id: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async update(id: string, entityData: any): Promise<QuizRow> {
    const { data, error } = await supabase
      .from('quizzes')
      .update(entityData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('quizzes')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
}

export class QuizAttempt {
  static tableName = 'quiz_attempts' as const;

  static async create(attemptData: Partial<QuizAttemptInsert>): Promise<QuizAttemptRow> {
    const { data, error } = await supabase
      .from('quiz_attempts')
      .insert([{
        ...attemptData,
        user_id: (await supabase.auth.getUser()).data.user?.id
      } as QuizAttemptInsert])
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

  static async list(orderBy = '-created_at'): Promise<QuizAttemptRow[]> {
    const { data, error } = await supabase
      .from('quiz_attempts')
      .select('*')
      .order(orderBy.replace('-', ''), { ascending: !orderBy.startsWith('-') });
    
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

  static async update(id: string, entityData: any): Promise<QuizAttemptRow> {
    const { data, error } = await supabase
      .from('quiz_attempts')
      .update(entityData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('quiz_attempts')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
}

export class UserProgress {
  static tableName = 'user_progress' as const;

  static async list(orderBy = '-updated_at'): Promise<UserProgressRow[]> {
    const { data, error } = await supabase
      .from('user_progress')
      .select('*')
      .order(orderBy.replace('-', ''), { ascending: !orderBy.startsWith('-') });
    
    if (error) throw error;
    return data;
  }

  static async create(progressData: Partial<UserProgressInsert>): Promise<UserProgressRow> {
    const { data, error } = await supabase
      .from('user_progress')
      .insert([{
        ...progressData,
        user_id: (await supabase.auth.getUser()).data.user?.id
      } as UserProgressInsert])
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

  static async update(id: string, entityData: any): Promise<UserProgressRow> {
    const { data, error } = await supabase
      .from('user_progress')
      .update(entityData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('user_progress')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
}

export class LearningPathway {
  static tableName = 'learning_pathways' as const;

  static async getByDifficulty(level: 'beginner' | 'intermediate' | 'advanced'): Promise<LearningPathwayRow[]> {
    const { data, error } = await supabase
      .from('learning_pathways')
      .select('*')
      .eq('difficulty_level', level)
      .order('completion_count', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async list(orderBy = '-created_at'): Promise<LearningPathwayRow[]> {
    const { data, error } = await supabase
      .from('learning_pathways')
      .select('*')
      .order(orderBy.replace('-', ''), { ascending: !orderBy.startsWith('-') });
    
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

  static async create(entityData: any): Promise<LearningPathwayRow> {
    const { data, error } = await supabase
      .from('learning_pathways')
      .insert([{
        ...entityData,
        user_id: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async update(id: string, entityData: any): Promise<LearningPathwayRow> {
    const { data, error } = await supabase
      .from('learning_pathways')
      .update(entityData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('learning_pathways')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
}

export class UserPathwayProgress {
  static tableName = 'user_pathway_progress' as const;

  static async list(orderBy = '-started_date'): Promise<UserPathwayProgressRow[]> {
    const { data, error } = await supabase
      .from('user_pathway_progress')
      .select('*')
      .order(orderBy.replace('-', ''), { ascending: !orderBy.startsWith('-') });
    
    if (error) throw error;
    return data;
  }

  static async create(progressData: Partial<UserPathwayProgressInsert>): Promise<UserPathwayProgressRow> {
    const { data, error } = await supabase
      .from('user_pathway_progress')
      .insert([{
        ...progressData,
        user_id: (await supabase.auth.getUser()).data.user?.id
      } as UserPathwayProgressInsert])
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

  static async update(id: string, entityData: any): Promise<UserPathwayProgressRow> {
    const { data, error } = await supabase
      .from('user_pathway_progress')
      .update(entityData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('user_pathway_progress')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
}

export class Course {
  static tableName = 'courses' as const;

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

  static async list(orderBy = '-created_at'): Promise<CourseRow[]> {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .order(orderBy.replace('-', ''), { ascending: !orderBy.startsWith('-') });
    
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

  static async create(entityData: any): Promise<CourseRow> {
    const { data, error } = await supabase
      .from('courses')
      .insert([{
        ...entityData,
        user_id: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async update(id: string, entityData: any): Promise<CourseRow> {
    const { data, error } = await supabase
      .from('courses')
      .update(entityData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
}
