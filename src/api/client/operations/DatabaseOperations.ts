import { supabase } from '@/integrations/supabase/client';
import { ApiResponse } from '@/types/common';
import { isValidUUID } from '@/types/guards';
import { DatabaseTable, TableRow, TableInsert, TableUpdate, RequestConfig } from '../types';
import { withTimeout } from '../utils/timeout';
import { withRetry } from '../utils/retry';
import { performanceMonitor } from '@/services/PerformanceMonitorService';
import { logDatabaseOperation, logDatabaseError } from '@/lib/utils/databaseLogger';

export class DatabaseOperations {
  private defaultTimeout = 10000;

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
    const startTime = performance.now();
    
    try {
      const result = await withRetry(async () => {
        const executeQuery = async () => {
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

        const response = await withTimeout(
          executeQuery(),
          config.timeout || this.defaultTimeout,
          config.abortSignal
        ) as { data: any; error: any };

        if (response.error) {
          throw new Error(response.error.message);
        }

        return {
          success: true,
          data: response.data as unknown as TableRow<T>[],
          error: undefined
        } as ApiResponse<TableRow<T>[]>;
      }, {
        maxAttempts: config.retries || 3
      });

      // Track performance
      const duration = performance.now() - startTime;
      performanceMonitor.trackMetric(`db_select_${table}`, duration, 'database_query');

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      performanceMonitor.trackMetric(`db_select_${table}`, duration, 'database_query', { 
        error: true,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      
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
    try {
      // ============================================
      // PHASE 4: ENHANCED LOGGING
      // ============================================
      logDatabaseOperation({
        operation: 'INSERT',
        table,
        data,
        timestamp: new Date().toISOString()
      });

      return await withRetry(async () => {
        const executeQuery = async () => {
          // ============================================
          // PHASE 2: TYPE SAFETY (with necessary type assertion)
          // Note: 'as any' needed here for Supabase client compatibility
          // Data sanitization happens at service layer
          // ============================================
          return supabase.from(table).insert(data as any).select().single();
        };
        
        const response = await withTimeout(
          executeQuery(),
          config.timeout || this.defaultTimeout,
          config.abortSignal
        ) as { data: any; error: any };

        if (response.error) {
          throw new Error(response.error.message);
        }

        return {
          success: true,
          data: response.data as unknown as TableRow<T>,
          error: undefined
        };
      }, {
        maxAttempts: config.retries || 3
      });
    } catch (error) {
      logDatabaseError('INSERT', table, error, data);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: undefined
      };
    }
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

    try {
      // ============================================
      // PHASE 4: ENHANCED LOGGING
      // ============================================
      logDatabaseOperation({
        operation: 'UPDATE',
        table,
        id,
        data,
        timestamp: new Date().toISOString()
      });

      return await withRetry(async () => {
        const executeQuery = async () => {
          // ============================================
          // PHASE 2: TYPE SAFETY (with necessary type assertion)
          // Note: 'as any' needed here for Supabase client compatibility
          // Data sanitization happens at service layer
          // ============================================
          // Simple direct update for all tables - let RLS handle authorization
          return supabase.from(table).update(data as any).eq('id' as any, id).select().maybeSingle();
        };
        
        const response = await withTimeout(
          executeQuery(),
          config.timeout || this.defaultTimeout,
          config.abortSignal
        ) as { data: any; error: any };

        if (response.error) {
          throw new Error(response.error.message);
        }

        // PHASE 1 - Task 1B: Detect RLS silent blocks
        if (!response.data) {
          console.error('🔒 [DatabaseOperations] RLS BLOCK DETECTED:', {
            table,
            id,
            updateData: data,
            hint: 'auth.uid() may not match user_id OR missing admin bypass in RLS policy'
          });
          throw new Error(`RLS policy blocked update for ${table}/${id}. Check authorization.`);
        }

        return {
          success: true,
          data: response.data as unknown as TableRow<T>,
          error: undefined
        };
      }, {
        maxAttempts: config.retries || 3
      });
    } catch (error) {
      logDatabaseError('UPDATE', table, error, { id, data });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: undefined
      };
    }
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

    try {
      return await withRetry(async () => {
        const executeQuery = async () => {
          return supabase.from(table).delete().eq('id' as any, id);
        };
        
        const response = await withTimeout(
          executeQuery(),
          config.timeout || this.defaultTimeout,
          config.abortSignal
        ) as { data: any; error: any };

        if (response.error) {
          throw new Error(response.error.message);
        }

        return {
          success: true,
          data: undefined,
          error: undefined
        };
      }, {
        maxAttempts: config.retries || 3
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: undefined
      };
    }
  }
}
