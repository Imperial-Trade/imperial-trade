import { EnhancedDatabaseOperations } from './operations/EnhancedDatabaseOperations';
import { AuthOperations } from './operations/AuthOperations';
import { RequestQueue } from './RequestQueue';
import { ApiResponse } from '@/types/common';
import { DatabaseTable, TableRow, TableInsert, TableUpdate, RequestConfig } from './types';
import { enhancedPerformanceMonitor } from '@/services/EnhancedPerformanceMonitor';

export class EnhancedApiClient {
  private static instance: EnhancedApiClient;
  private databaseOps: EnhancedDatabaseOperations;
  private authOps: AuthOperations;
  private requestQueue: RequestQueue;

  private constructor() {
    this.databaseOps = new EnhancedDatabaseOperations();
    this.authOps = new AuthOperations();
    this.requestQueue = new RequestQueue();
    
    console.log('🚀 Enhanced API Client initialized with Redis caching and connection pooling');
  }

  static getInstance(): EnhancedApiClient {
    if (!EnhancedApiClient.instance) {
      EnhancedApiClient.instance = new EnhancedApiClient();
    }
    return EnhancedApiClient.instance;
  }

  // Enhanced select with intelligent caching
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
    
    // Check if request is already in progress (deduplication)
    if (this.requestQueue.hasRequest(cacheKey) && !config.bypassCache) {
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

  // High-performance trading-specific methods
  async getActiveSignals(userId?: string): Promise<ApiResponse<TableRow<'trade_alerts'>[]>> {
    return enhancedPerformanceMonitor.trackSignalDelivery(async () => {
      return this.databaseOps.getActiveSignals(userId);
    }, 'active_signals');
  }

  async getRecentPrices(symbols: string[]): Promise<ApiResponse<TableRow<'market_prices'>[]>> {
    return enhancedPerformanceMonitor.trackPriceUpdate(async () => {
      return this.databaseOps.getRecentPrices(symbols);
    }, symbols.join(','));
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

  // Performance monitoring integration
  getPerformanceStats() {
    return enhancedPerformanceMonitor.getCurrentSnapshot();
  }

  isPerformanceOptimal(): boolean {
    return enhancedPerformanceMonitor.isPerformanceOptimal();
  }
}

// Export enhanced instance
export const enhancedApiClient = EnhancedApiClient.getInstance();
