
import { supabase } from '@/integrations/supabase/client';
import { ApiResponse } from '@/types/common';
import { isValidUUID } from '@/types/guards';
import { DatabaseTable, TableRow, TableInsert, TableUpdate, RequestConfig } from '../types';
import { withTimeout } from '../utils/timeout';
import { withRetry } from '../utils/retry';

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

      return result;
    } catch (error) {
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
          return supabase.from(table).update(data as any).eq('id' as any, id).select().single();
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
