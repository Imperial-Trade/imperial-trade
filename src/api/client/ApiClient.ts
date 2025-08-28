
import { supabase } from '@/integrations/supabase/client';
// Removed Database generic to prevent TS2589 "excessively deep" errors
// import type { Database } from './types';
import { ApiResponse } from '@/types/common';
import { isValidUUID } from '@/types/guards';

// Note: We intentionally avoid deep, table-specific generics here to prevent TS2589 errors.

export class ApiClient {
  private static instance: ApiClient;

  private constructor() {}

  static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  // Simplified types to avoid deep instantiation
  async select(
    table: string,
    options?: {
      select?: string;
      eq?: { column: string; value: any };
      order?: { column: string; ascending?: boolean };
      limit?: number;
    }
  ): Promise<ApiResponse<any[]>> {
    try {
      let query = supabase.from(table).select(options?.select || '*');

      if (options?.eq) {
        query = query.eq(options.eq.column as any, options.eq.value as any);
      }

      if (options?.order) {
        query = query.order(options.order.column as any, { 
          ascending: options.order.ascending ?? true 
        });
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error(`Database error in ${table} select:`, error);
        return {
          success: false,
          error: error.message,
          data: undefined
        };
      }

      return {
        success: true,
        data: data as any[],
        error: undefined
      };
    } catch (error) {
      console.error(`Unexpected error in ${table} select:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: undefined
      };
    }
  }

  async insert(
    table: string,
    data: any
  ): Promise<ApiResponse<any>> {
    try {
      console.log(`📝 Inserting into ${table}:`, data);
      const { data: result, error } = await supabase
        .from(table)
        .insert(data as any)
        .select()
        .single();

      if (error) {
        console.error(`Database error in ${table} insert:`, error);
        return {
          success: false,
          error: error.message,
          data: undefined
        };
      }

      return {
        success: true,
        data: result as any,
        error: undefined
      };
    } catch (error) {
      console.error(`Unexpected error in ${table} insert:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: undefined
      };
    }
  }

  async update(
    table: string,
    id: string,
    data: any
  ): Promise<ApiResponse<any>> {
    try {
      if (!isValidUUID(id)) {
        return {
          success: false,
          error: 'Invalid ID format',
          data: undefined
        };
      }

      const { data: result, error } = await supabase
        .from(table)
        .update(data as any)
        .eq('id' as any, id as any)
        .select()
        .single();

      if (error) {
        console.error(`Database error in ${table} update:`, error);
        return {
          success: false,
          error: error.message,
          data: undefined
        };
      }

      return {
        success: true,
        data: result as any,
        error: undefined
      };
    } catch (error) {
      console.error(`Unexpected error in ${table} update:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: undefined
      };
    }
  }

  async delete(
    table: string,
    id: string
  ): Promise<ApiResponse<void>> {
    try {
      if (!isValidUUID(id)) {
        return {
          success: false,
          error: 'Invalid ID format',
          data: undefined
        };
      }

      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id' as any, id as any);

      if (error) {
        console.error(`Database error in ${table} delete:`, error);
        return {
          success: false,
          error: error.message,
          data: undefined
        };
      }

      return {
        success: true,
        data: undefined,
        error: undefined
      };
    } catch (error) {
      console.error(`Unexpected error in ${table} delete:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: undefined
      };
    }
  }

  async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        return {
          success: false,
          error: error.message,
          data: undefined
        };
      }

      return {
        success: true,
        data: user,
        error: undefined
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: undefined
      };
    }
  }
}

export const apiClient = ApiClient.getInstance();
