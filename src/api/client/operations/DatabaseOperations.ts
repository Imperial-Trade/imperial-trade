import { supabase } from '@/integrations/supabase/client';
import { ApiResponse } from '@/types/common';
import { isValidUUID } from '@/types/guards';
import { DatabaseTable, TableRow, TableInsert, TableUpdate, RequestConfig } from '../types';
import { withTimeout } from '../utils/timeout';
import { withRetry } from '../utils/retry';
import { performanceMonitor } from '@/services/PerformanceMonitorService';

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
      return await withRetry(async () => {
        const executeQuery = async () => {
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
      return await withRetry(async () => {
        const executeQuery = async () => {
          // 🛡️ LAYER 2: Explicitly strip is_xeon_stream from trade_alerts updates
          let sanitizedData = data;
          if (table === 'trade_alerts') {
            const { is_xeon_stream, ...cleanData } = data as any;
            sanitizedData = cleanData as TableUpdate<T>;
            
            // 🚨 CRITICAL: Runtime check to ensure is_xeon_stream never makes it through
            if ('is_xeon_stream' in sanitizedData) {
              console.error('🚨 CRITICAL: is_xeon_stream found in sanitizedData after filtering!');
              delete (sanitizedData as any).is_xeon_stream;
            }
            
            console.log('🔒 [DatabaseOperations] Sanitized trade_alerts update:', {
              originalKeys: Object.keys(data),
              sanitizedKeys: Object.keys(sanitizedData),
              strippedIsXeonStream: 'is_xeon_stream' in data,
              finalCheck: 'is_xeon_stream' in sanitizedData
            });
          }
          
          // 🎯 Type-safe exclusion: Cast to explicitly exclude is_xeon_stream from TypeScript types
          type SafeUpdate = T extends 'trade_alerts' 
            ? Omit<TableUpdate<'trade_alerts'>, 'is_xeon_stream'>
            : TableUpdate<T>;
          
          const safeData = sanitizedData as SafeUpdate;
          
          return supabase.from(table).update(safeData as any).eq('id' as any, id).select().maybeSingle();
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
