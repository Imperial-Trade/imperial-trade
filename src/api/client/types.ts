
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
