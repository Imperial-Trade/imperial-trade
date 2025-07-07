
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
  static tableName = 'quizzes' as const;

  static async getByVideoId(videoId: string): Promise<QuizRow> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('video_id', videoId)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async list(orderBy = '-created_at'): Promise<QuizRow[]> {
    return BaseEntity.genericList(this.tableName, orderBy);
  }

  static async getById(id: string): Promise<QuizRow> {
    return BaseEntity.genericGetById(this.tableName, id);
  }

  static async create(entityData: any): Promise<QuizRow> {
    return BaseEntity.genericCreate(this.tableName, entityData);
  }

  static async update(id: string, entityData: any): Promise<QuizRow> {
    return BaseEntity.genericUpdate(this.tableName, id, entityData);
  }

  static async delete(id: string): Promise<void> {
    return BaseEntity.genericDelete(this.tableName, id);
  }
}

export class QuizAttempt {
  static tableName = 'quiz_attempts' as const;

  static async create(attemptData: Partial<QuizAttemptInsert>): Promise<QuizAttemptRow> {
    return BaseEntity.genericCreate(this.tableName, attemptData);
  }

  static async getByQuizId(quizId: string): Promise<QuizAttemptRow[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('quiz_id', quizId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async list(orderBy = '-created_at'): Promise<QuizAttemptRow[]> {
    return BaseEntity.genericList(this.tableName, orderBy);
  }

  static async getById(id: string): Promise<QuizAttemptRow> {
    return BaseEntity.genericGetById(this.tableName, id);
  }

  static async update(id: string, entityData: any): Promise<QuizAttemptRow> {
    return BaseEntity.genericUpdate(this.tableName, id, entityData);
  }

  static async delete(id: string): Promise<void> {
    return BaseEntity.genericDelete(this.tableName, id);
  }
}

export class UserProgress {
  static tableName = 'user_progress' as const;

  static async list(orderBy = '-updated_at'): Promise<UserProgressRow[]> {
    return BaseEntity.genericList(this.tableName, orderBy);
  }

  static async create(progressData: Partial<UserProgressInsert>): Promise<UserProgressRow> {
    return BaseEntity.genericCreate(this.tableName, progressData);
  }

  static async getByVideoId(videoId: string): Promise<UserProgressRow> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('video_id', videoId)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async getById(id: string): Promise<UserProgressRow> {
    return BaseEntity.genericGetById(this.tableName, id);
  }

  static async update(id: string, entityData: any): Promise<UserProgressRow> {
    return BaseEntity.genericUpdate(this.tableName, id, entityData);
  }

  static async delete(id: string): Promise<void> {
    return BaseEntity.genericDelete(this.tableName, id);
  }
}

export class LearningPathway {
  static tableName = 'learning_pathways' as const;

  static async getByDifficulty(level: 'beginner' | 'intermediate' | 'advanced'): Promise<LearningPathwayRow[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('difficulty_level', level)
      .order('completion_count', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async list(orderBy = '-created_at'): Promise<LearningPathwayRow[]> {
    return BaseEntity.genericList(this.tableName, orderBy);
  }

  static async getById(id: string): Promise<LearningPathwayRow> {
    return BaseEntity.genericGetById(this.tableName, id);
  }

  static async create(entityData: any): Promise<LearningPathwayRow> {
    return BaseEntity.genericCreate(this.tableName, entityData);
  }

  static async update(id: string, entityData: any): Promise<LearningPathwayRow> {
    return BaseEntity.genericUpdate(this.tableName, id, entityData);
  }

  static async delete(id: string): Promise<void> {
    return BaseEntity.genericDelete(this.tableName, id);
  }
}

export class UserPathwayProgress {
  static tableName = 'user_pathway_progress' as const;

  static async list(orderBy = '-started_date'): Promise<UserPathwayProgressRow[]> {
    return BaseEntity.genericList(this.tableName, orderBy);
  }

  static async create(progressData: Partial<UserPathwayProgressInsert>): Promise<UserPathwayProgressRow> {
    return BaseEntity.genericCreate(this.tableName, progressData);
  }

  static async getByPathwayId(pathwayId: string): Promise<UserPathwayProgressRow> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('pathway_id', pathwayId)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async getById(id: string): Promise<UserPathwayProgressRow> {
    return BaseEntity.genericGetById(this.tableName, id);
  }

  static async update(id: string, entityData: any): Promise<UserPathwayProgressRow> {
    return BaseEntity.genericUpdate(this.tableName, id, entityData);
  }

  static async delete(id: string): Promise<void> {
    return BaseEntity.genericDelete(this.tableName, id);
  }
}

export class Course {
  static tableName = 'courses' as const;

  static async getByCategory(category: string): Promise<CourseRow[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('category', category)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async getByDifficulty(difficulty: 'Beginner' | 'Intermediate' | 'Advanced'): Promise<CourseRow[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('difficulty', difficulty)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async list(orderBy = '-created_at'): Promise<CourseRow[]> {
    return BaseEntity.genericList(this.tableName, orderBy);
  }

  static async getById(id: string): Promise<CourseRow> {
    return BaseEntity.genericGetById(this.tableName, id);
  }

  static async create(entityData: any): Promise<CourseRow> {
    return BaseEntity.genericCreate(this.tableName, entityData);
  }

  static async update(id: string, entityData: any): Promise<CourseRow> {
    return BaseEntity.genericUpdate(this.tableName, id, entityData);
  }

  static async delete(id: string): Promise<void> {
    return BaseEntity.genericDelete(this.tableName, id);
  }
}
