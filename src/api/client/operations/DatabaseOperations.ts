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
          // 🎯 SPECIAL HANDLING: Use RPC for trade_alerts to bypass client schema merging
          if (table === 'trade_alerts') {
            console.log('🔒 [RPC Mode] Using update_trade_alert_safe for trade_alerts');
            
            const tradeAlertData = data as TableUpdate<'trade_alerts'>;
            
            console.log('🔒 [DatabaseOperations] Calling RPC update_trade_alert_safe:', {
              p_id: id,
              p_status: tradeAlertData.status ?? null,
              p_tp_hits: tradeAlertData.tp_hits ?? null,
              p_close_reason: tradeAlertData.close_reason ?? null,
              p_notes: tradeAlertData.notes ?? null,
              p_is_xeon_stream: (tradeAlertData.is_xeon_stream === undefined || (tradeAlertData.is_xeon_stream as unknown) === '')
                ? null
                : tradeAlertData.is_xeon_stream
            });
            
            // Call RPC function - pass undefined as null, but keep actual values
            // This allows the RPC to distinguish between "not provided" and "explicitly set"
            const { data: rpcData, error: rpcError } = await supabase.rpc(
              'update_trade_alert_safe',
              {
                p_id: id,
                p_status: tradeAlertData.status ?? null,
                p_tp_hits: tradeAlertData.tp_hits ?? null,
                p_close_reason: tradeAlertData.close_reason ?? null,
                p_notes: tradeAlertData.notes ?? null,
                p_is_xeon_stream: (tradeAlertData.is_xeon_stream === undefined || (tradeAlertData.is_xeon_stream as unknown) === '')
                  ? null
                  : tradeAlertData.is_xeon_stream
              }
            ).maybeSingle();

            console.log('🔒 [DatabaseOperations] RPC result:', { 
              rpcData, 
              rpcError,
              hasData: !!rpcData,
              errorCode: rpcError?.code,
              errorMessage: rpcError?.message,
              errorDetails: rpcError?.details
            });

            if (rpcError) {
              console.error('❌ [DatabaseOperations] RPC error:', {
                message: rpcError.message,
                details: rpcError.details,
                hint: rpcError.hint,
                code: rpcError.code
              });
              throw new Error(`RPC Error: ${rpcError.message}`);
            }

            if (!rpcData) {
              throw new Error('Update returned null - authorization may have failed');
            }

            return { data: rpcData, error: null };
          }

          // For all other tables, use standard update method
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
