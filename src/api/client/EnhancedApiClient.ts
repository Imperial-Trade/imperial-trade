
import { DatabaseTable, TableRow, TableInsert, TableUpdate, RequestConfig } from './types';
import { DatabaseOperations } from './operations/DatabaseOperations';
import { AuthOperations } from './operations/AuthOperations';
import { RequestQueue } from './RequestQueue';
import { ApiResponse } from '@/types/common';

export class EnhancedApiClient {
  private static instance: EnhancedApiClient;
  private databaseOps: DatabaseOperations;
  private authOps: AuthOperations;
  private requestQueue: RequestQueue;

  private constructor() {
    this.databaseOps = new DatabaseOperations();
    this.authOps = new AuthOperations();
    this.requestQueue = new RequestQueue();
  }

  static getInstance(): EnhancedApiClient {
    if (!EnhancedApiClient.instance) {
      EnhancedApiClient.instance = new EnhancedApiClient();
    }
    return EnhancedApiClient.instance;
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
    const cacheKey = this.requestQueue.getCacheKey('select', { table, options });
    
    if (this.requestQueue.hasRequest(cacheKey)) {
      return this.requestQueue.getRequest(cacheKey);
    }

    const requestPromise = this.databaseOps.select(table, options, config);
    this.requestQueue.addRequest(cacheKey, requestPromise);
    
    try {
      const result = await requestPromise;
      this.requestQueue.removeRequest(cacheKey);
      return result;
    } catch (error) {
      this.requestQueue.removeRequest(cacheKey);
      throw error;
    }
  }

  async insert<T extends DatabaseTable>(
    table: T,
    data: TableInsert<T>,
    config: RequestConfig = {}
  ): Promise<ApiResponse<TableRow<T>>> {
    return this.databaseOps.insert(table, data, config);
  }

  async update<T extends DatabaseTable>(
    table: T,
    id: string,
    data: TableUpdate<T>,
    config: RequestConfig = {}
  ): Promise<ApiResponse<TableRow<T>>> {
    return this.databaseOps.update(table, id, data, config);
  }

  async delete<T extends DatabaseTable>(
    table: T,
    id: string,
    config: RequestConfig = {}
  ): Promise<ApiResponse<void>> {
    return this.databaseOps.delete(table, id, config);
  }

  async getCurrentUser(config: RequestConfig = {}) {
    return this.authOps.getCurrentUser(config);
  }

  cancelAllRequests() {
    this.requestQueue.cancelAllRequests();
  }

  getPendingRequestCount(): number {
    return this.requestQueue.getPendingRequestCount();
  }
}

export const enhancedApiClient = EnhancedApiClient.getInstance();
