
import { Database } from '@/integrations/supabase/types';

export type DatabaseTable = keyof Database['public']['Tables'];
export type TableRow<T extends DatabaseTable> = Database['public']['Tables'][T]['Row'];
export type TableInsert<T extends DatabaseTable> = Database['public']['Tables'][T]['Insert'];
export type TableUpdate<T extends DatabaseTable> = Database['public']['Tables'][T]['Update'];

export interface RequestConfig {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  abortSignal?: AbortSignal;
}

export interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

export interface CoachingAnalysis {
  execution_analysis: string;
  risk_management: string;
  strengths: string;
  improvements: string;
  recommendations: string;
  overall_score: number;
  key_insights: string[];
}

export interface AiCoachFeedback {
  id: string;
  user_id: string;
  journal_entry_id: string;
  coaching_analysis: CoachingAnalysis;
  feedback_type: string;
  model_used: string;
  created_at: string;
  updated_at: string;
}
