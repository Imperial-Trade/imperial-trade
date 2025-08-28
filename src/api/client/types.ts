
/**
 * Lightweight API client types to avoid deep type instantiation from Supabase types.
 * These are used by the EnhancedApiClient and related operations.
 */

// Removed heavy Database import to prevent TS2589 issues
// import { Database } from '@/integrations/supabase/types';

export type DatabaseTable = string;
export type TableRow<T extends DatabaseTable = string> = Record<string, any>;
export type TableInsert<T extends DatabaseTable = string> = Record<string, any>;
export type TableUpdate<T extends DatabaseTable = string> = Record<string, any>;

export interface RequestConfig {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  abortSignal?: AbortSignal;
  // Allow callers to bypass cache for critical real-time paths
  bypassCache?: boolean;
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
