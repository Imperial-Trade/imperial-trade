
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { ApiResponse, PaginatedResponse } from '@/types/common';
import { isApiResponse, isValidUUID } from '@/types/guards';

export type DatabaseTable = keyof Database['public']['Tables'];
export type TableRow<T extends DatabaseTable> = Database['public']['Tables'][T]['Row'];
export type TableInsert<T extends DatabaseTable> = Database['public']['Tables'][T]['Insert'];
export type TableUpdate<T extends DatabaseTable> = Database['public']['Tables'][T]['Update'];

export class ApiClient {
  private static instance: ApiClient;

  private constructor() {}

  static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  async select<T extends DatabaseTable>(
    table: T,
    options?: {
      select?: string;
      eq?: { column: string; value: any };
      order?: { column: string; ascending?: boolean };
      limit?: number;
    }
  ): Promise<ApiResponse<TableRow<T>[]>> {
    try {
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

      const { data, error } = await query;

      if (error) {
        return {
          success: false,
          error: error.message,
          data: undefined
        };
      }

      return {
        success: true,
        data: data as TableRow<T>[],
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

  async insert<T extends DatabaseTable>(
    table: T,
    data: TableInsert<T>
  ): Promise<ApiResponse<TableRow<T>>> {
    try {
      const { data: result, error } = await supabase
        .from(table)
        .insert(data)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: error.message,
          data: undefined
        };
      }

      return {
        success: true,
        data: result as TableRow<T>,
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

  async update<T extends DatabaseTable>(
    table: T,
    id: string,
    data: TableUpdate<T>
  ): Promise<ApiResponse<TableRow<T>>> {
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
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: error.message,
          data: undefined
        };
      }

      return {
        success: true,
        data: result as TableRow<T>,
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

  async delete<T extends DatabaseTable>(
    table: T,
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
        .eq('id', id);

      if (error) {
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
