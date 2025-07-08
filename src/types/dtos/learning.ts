
import { BaseEntityDto, UserOwnedEntityDto } from './common';

// Video DTOs
export interface VideoDto extends BaseEntityDto {
  title: string;
  description?: string;
  video_url: string;
  thumbnail_url?: string;
  duration?: number;
  category?: string;
  difficulty?: string;
}

// Course DTOs
export interface CourseDto extends BaseEntityDto {
  title: string;
  description: string;
  category?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  thumbnail_url?: string;
  lessons?: Array<Record<string, unknown>>;
}

// Quiz DTOs
export interface QuizDto extends BaseEntityDto {
  title: string;
  video_id: string;
  questions: Array<{
    question: string;
    options: string[];
    correct_answer: number;
  }>;
}

// Quiz Attempt DTOs
export interface QuizAttemptDto extends UserOwnedEntityDto {
  quiz_id: string;
  user_email: string;
  answers: Record<string, unknown>;
  score: number;
}

// User Progress DTOs
export interface UserProgressDto extends UserOwnedEntityDto {
  video_id: string;
  user_email: string;
  status: 'not_started' | 'in_progress' | 'completed';
}

// Learning Pathway DTOs
export interface LearningPathwayDto extends BaseEntityDto {
  pathway_name: string;
  description: string;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  estimated_hours?: number;
  modules: Array<Record<string, unknown>>;
  certificate_name?: string;
  completion_count: number;
}

// User Pathway Progress DTOs
export interface UserPathwayProgressDto extends UserOwnedEntityDto {
  pathway_id: string;
  user_email: string;
  current_module: number;
  completion_percentage: number;
  started_date: string;
  completed_date?: string;
  certificate_earned: boolean;
}
