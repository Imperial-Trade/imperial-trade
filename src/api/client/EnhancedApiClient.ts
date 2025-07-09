
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { ApiResponse } from '@/types/common';
import { isValidUUID } from '@/types/guards';

export type DatabaseTable = keyof Database['public']['Tables'];
export type TableRow<T extends DatabaseTable> = Database['public']['Tables'][T]['Row'];
export type TableInsert<T extends DatabaseTable> = Database['public']['Tables'][T]['Insert'];
export type TableUpdate<T extends DatabaseTable> = Database['public']['Tables'][T]['Update'];

interface RequestConfig {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  abortSignal?: AbortSignal;
}

interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

export class EnhancedApiClient {
  private static instance: EnhancedApiClient;
  private requestQueue: Map<string, Promise<any>> = new Map();
  private defaultTimeout = 10000; // 10 seconds
  private defaultRetryConfig: RetryConfig = {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2
  };

  private constructor() {}

  static getInstance(): EnhancedApiClient {
    if (!EnhancedApiClient.instance) {
      EnhancedApiClient.instance = new EnhancedApiClient();
    }
    return EnhancedApiClient.instance;
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    abortSignal?: AbortSignal
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Request timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      const cleanup = () => clearTimeout(timeoutId);

      if (abortSignal) {
        abortSignal.addEventListener('abort', () => {
          cleanup();
          reject(new Error('Request aborted'));
        });
      }

      promise
        .then((result) => {
          cleanup();
          resolve(result);
        })
        .catch((error) => {
          cleanup();
          reject(error);
        });
    });
  }

  private async withRetry<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {}
  ): Promise<T> {
    const retryConfig = { ...this.defaultRetryConfig, ...config };
    let lastError: Error;

    for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === retryConfig.maxAttempts) {
          throw lastError;
        }

        // Don't retry on certain errors
        if (this.isNonRetryableError(lastError)) {
          throw lastError;
        }

        const delay = Math.min(
          retryConfig.initialDelay * Math.pow(retryConfig.backoffFactor, attempt - 1),
          retryConfig.maxDelay
        );

        console.log(`Attempt ${attempt} failed, retrying in ${delay}ms:`, lastError.message);
        await this.delay(delay);
      }
    }

    throw lastError!;
  }

  private isNonRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return (
      message.includes('invalid') ||
      message.includes('unauthorized') ||
      message.includes('forbidden') ||
      message.includes('not found') ||
      message.includes('bad request')
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getCacheKey(operation: string, params: any): string {
    return `${operation}_${JSON.stringify(params)}`;
  }

  async select<T extends DatabaseTable>(
    table: T,
    options?: {
      select?: string;
      eq?: { column: string; value: any };
      order?: { column: string; ascending?: boolean };
      limit?: number;
    },
    config: RequestConfig = {}
  ): Promise<ApiResponse<TableRow<T>[]>> {
    const cacheKey = this.getCacheKey('select', { table, options });
    
    if (this.requestQueue.has(cacheKey)) {
      return this.requestQueue.get(cacheKey);
    }

    const requestPromise = this.withRetry(async () => {
      const operation = async () => {
        let query = supabase.from(table).select(options?.select || '*');

        if (options?.eq) {
          query = query.eq(options.eq.column, options.eq.value);
        }

        if (options?.order) {
          query = query.order(options.order.column, { 
            ascending: options.order.ascending ?? true 
          });
        }

        if (options?.limit) {
          query = query.limit(options.limit);
        }

        return query;
      };

      const { data, error } = await this.withTimeout(
        operation(),
        config.timeout || this.defaultTimeout,
        config.abortSignal
      );

      if (error) {
        throw new Error(error.message);
      }

      return {
        success: true,
        data: data as unknown as TableRow<T>[],
        error: undefined
      } as ApiResponse<TableRow<T>[]>;
    }, {
      maxAttempts: config.retries || this.defaultRetryConfig.maxAttempts
    });

    this.requestQueue.set(cacheKey, requestPromise);
    
    try {
      const result = await requestPromise;
      this.requestQueue.delete(cacheKey);
      return result;
    } catch (error) {
      this.requestQueue.delete(cacheKey);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: undefined
      };
    }
  }

  async insert<T extends DatabaseTable>(
    table: T,
    data: TableInsert<T>,
    config: RequestConfig = {}
  ): Promise<ApiResponse<TableRow<T>>> {
    return this.withRetry(async () => {
      const { data: result, error } = await this.withTimeout(
        supabase.from(table).insert(data as any).select().single(),
        config.timeout || this.defaultTimeout,
        config.abortSignal
      );

      if (error) {
        throw new Error(error.message);
      }

      return {
        success: true,
        data: result as unknown as TableRow<T>,
        error: undefined
      };
    }, {
      maxAttempts: config.retries || this.defaultRetryConfig.maxAttempts
    }).catch(error => ({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: undefined
    }));
  }

  async update<T extends DatabaseTable>(
    table: T,
    id: string,
    data: TableUpdate<T>,
    config: RequestConfig = {}
  ): Promise<ApiResponse<TableRow<T>>> {
    if (!isValidUUID(id)) {
      return {
        success: false,
        error: 'Invalid ID format',
        data: undefined
      };
    }

    return this.withRetry(async () => {
      const { data: result, error } = await this.withTimeout(
        supabase.from(table).update(data as any).eq('id' as any, id).select().single(),
        config.timeout || this.defaultTimeout,
        config.abortSignal
      );

      if (error) {
        throw new Error(error.message);
      }

      return {
        success: true,
        data: result as unknown as TableRow<T>,
        error: undefined
      };
    }, {
      maxAttempts: config.retries || this.defaultRetryConfig.maxAttempts
    }).catch(error => ({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: undefined
    }));
  }

  async delete<T extends DatabaseTable>(
    table: T,
    id: string,
    config: RequestConfig = {}
  ): Promise<ApiResponse<void>> {
    if (!isValidUUID(id)) {
      return {
        success: false,
        error: 'Invalid ID format',
        data: undefined
      };
    }

    return this.withRetry(async () => {
      const { error } = await this.withTimeout(
        supabase.from(table).delete().eq('id' as any, id),
        config.timeout || this.defaultTimeout,
        config.abortSignal
      );

      if (error) {
        throw new Error(error.message);
      }

      return {
        success: true,
        data: undefined,
        error: undefined
      };
    }, {
      maxAttempts: config.retries || this.defaultRetryConfig.maxAttempts
    }).catch(error => ({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: undefined
    }));
  }

  async getCurrentUser(config: RequestConfig = {}) {
    return this.withRetry(async () => {
      const { data: { user }, error } = await this.withTimeout(
        supabase.auth.getUser(),
        config.timeout || this.defaultTimeout,
        config.abortSignal
      );
      
      if (error) {
        throw new Error(error.message);
      }

      return {
        success: true,
        data: user,
        error: undefined
      };
    }, {
      maxAttempts: config.retries || this.defaultRetryConfig.maxAttempts
    }).catch(error => ({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: undefined
    }));
  }

  // Cancel all pending requests
  cancelAllRequests() {
    this.requestQueue.clear();
  }

  // Get pending request count
  getPendingRequestCount(): number {
    return this.requestQueue.size;
  }
}

export const enhancedApiClient = EnhancedApiClient.getInstance();
