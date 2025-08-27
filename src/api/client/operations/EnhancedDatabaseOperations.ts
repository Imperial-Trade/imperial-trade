import { DatabaseOperations } from './DatabaseOperations';
import { redisCache } from '@/services/RedisCache';
import { connectionPool } from '@/services/ConnectionPoolManager';
import { enhancedPerformanceMonitor } from '@/services/EnhancedPerformanceMonitor';
import { securityAuditService } from '@/services/SecurityAuditService';
import { DatabaseTable, TableRow, TableInsert, TableUpdate, RequestConfig } from '../types';
import { ApiResponse } from '@/types/common';

/**
 * Enhanced Database Operations with Redis Caching, Connection Pooling, and Security Auditing
 * Optimized for sub-100ms signal delivery in high-frequency trading
 */
export class EnhancedDatabaseOperations extends DatabaseOperations {
  // Cache-optimized select with intelligent caching strategies and security logging
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
    // Log access to sensitive tables
    if (this.isSensitiveTable(table)) {
      await securityAuditService.logSuspiciousActivity(
        `access_${table}`,
        undefined,
        undefined,
        { query_options: options }
      );
    }

    // Generate cache key for this query
    const cacheKey = this.generateCacheKey(table, options);
    
    // Try cache first for read operations
    const cachedResult = redisCache.read<TableRow<T>[]>(cacheKey);
    if (cachedResult && !config.bypassCache) {
      console.log(`⚡ Cache HIT for ${table} query`);
      return {
        success: true,
        data: cachedResult,
        error: undefined
      };
    }

    // Execute with performance monitoring and connection pooling
    return enhancedPerformanceMonitor.trackSignalDelivery(async () => {
      return connectionPool.execute(async () => {
        const result = await super.select(table, options, config);
        
        if (result.success && result.data) {
          // Cache successful results with appropriate TTL
          const ttl = this.getCacheTTL(table);
          redisCache.write<TableRow<T>[]>(cacheKey, result.data, ttl);
          console.log(`💾 Cached ${table} result for ${ttl}ms`);
        }
        
        return result;
      }, this.getOperationPriority(table, 'select'));
    }, `${table}_select`);
  }

  // High-priority insert with cache invalidation and security logging
  async insert<T extends DatabaseTable>(
    table: T,
    data: TableInsert<T>,
    config: RequestConfig = {}
  ): Promise<ApiResponse<TableRow<T>>> {
    // Log sensitive table insertions
    if (this.isSensitiveTable(table)) {
      await securityAuditService.logSuspiciousActivity(
        `insert_${table}`,
        undefined,
        undefined,
        { data_keys: Object.keys(data as any) }
      );
    }

    return enhancedPerformanceMonitor.trackSignalDelivery(async () => {
      return connectionPool.execute(async () => {
        const result = await super.insert(table, data, config);
        
        if (result.success) {
          // Invalidate related cache entries
          this.invalidateTableCache(table);
          console.log(`🗑️ Cache invalidated for ${table} after insert`);
        }
        
        return result;
      }, 'high'); // Insert operations are high priority
    }, `${table}_insert`);
  }

  // Optimized update with targeted cache invalidation
  async update<T extends DatabaseTable>(
    table: T,
    id: string,
    data: TableUpdate<T>,
    config: RequestConfig = {}
  ): Promise<ApiResponse<TableRow<T>>> {
    return enhancedPerformanceMonitor.trackSignalDelivery(async () => {
      return connectionPool.execute(async () => {
        const result = await super.update(table, id, data, config);
        
        if (result.success) {
          // Targeted cache invalidation for specific record
          this.invalidateRecordCache(table, id);
          console.log(`🎯 Cache invalidated for ${table}:${id} after update`);
        }
        
        return result;
      }, this.getOperationPriority(table, 'update'));
    }, `${table}_update`);
  }

  // Delete with cache cleanup
  async delete<T extends DatabaseTable>(
    table: T,
    id: string,
    config: RequestConfig = {}
  ): Promise<ApiResponse<void>> {
    return enhancedPerformanceMonitor.trackSignalDelivery(async () => {
      return connectionPool.execute(async () => {
        const result = await super.delete(table, id, config);
        
        if (result.success) {
          // Clean up all related cache entries
          this.invalidateRecordCache(table, id);
          console.log(`🧹 Cache cleaned for ${table}:${id} after delete`);
        }
        
        return result;
      }, 'normal');
    }, `${table}_delete`);
  }

  // Specialized methods for trading operations
  async getActiveSignals(userId?: string): Promise<ApiResponse<TableRow<'trade_alerts'>[]>> {
    const cacheKey = `active_signals:${userId || 'all'}`;
    
    // Try cache first
    const cached = redisCache.getSignal(cacheKey);
    if (cached) {
      return { success: true, data: cached, error: undefined };
    }

    const options = userId 
      ? { eq: { column: 'user_id', value: userId }, order: { column: 'created_at', ascending: false } }
      : { eq: { column: 'status', value: 'active' }, order: { column: 'created_at', ascending: false } };

    const result = await this.select('trade_alerts', options);
    
    if (result.success && result.data) {
      // Cache active signals for 30 seconds
      redisCache.setSignal(cacheKey, result.data, 30000);
    }
    
    return result;
  }

  async getRecentPrices(symbols: string[]): Promise<ApiResponse<TableRow<'market_prices'>[]>> {
    const cacheKey = `prices:${symbols.sort().join(',')}`;
    
    // Try batch cache lookup
    const cached = redisCache.read<TableRow<'market_prices'>[]>(cacheKey);
    if (cached) {
      return { success: true, data: cached, error: undefined };
    }

    // Fetch from database with optimized query
    const result = await this.select('market_prices', {
      select: 'symbol, bid, ask, updated_at',
      limit: symbols.length * 2 // Allow for multiple entries per symbol
    });
    
    if (result.success && result.data) {
      // Cache prices for 5 seconds (very short TTL for market data)
      redisCache.write(cacheKey, result.data, 5000);
      
      // Also cache individual symbol prices
      result.data.forEach((price: TableRow<'market_prices'>) => {
        if (price.symbol) {
          redisCache.setPrice(price.symbol, (price as any).bid || 0, 5000);
        }
      });
    }
    
    return result;
  }

  // Helper method to identify sensitive tables
  private isSensitiveTable<T extends DatabaseTable>(table: T): boolean {
    const sensitiveTables: DatabaseTable[] = [
      'profiles',
      'user_roles',
      'audit_logs',
      'role_change_audit',
      'account_requests',
      'admin_notification_events'
    ];
    return sensitiveTables.includes(table);
  }

  // Cache key generation
  private generateCacheKey<T extends DatabaseTable>(
    table: T, 
    options?: any
  ): string {
    const optionsHash = options ? JSON.stringify(options) : 'all';
    return `query:${table}:${this.hashString(optionsHash)}`;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  // Cache TTL strategies based on table type
  private getCacheTTL<T extends DatabaseTable>(table: T): number {
    switch (table) {
      case 'trade_alerts':
        return 30000; // 30s for active signals
      case 'market_prices':
        return 5000;  // 5s for market data
      case 'profiles':
        return 300000; // 5min for user profiles
      case 'notification_settings':
        return 600000; // 10min for settings
      default:
        return 60000;  // 1min default
    }
  }

  // Operation priority based on table and operation type
  private getOperationPriority<T extends DatabaseTable>(
    table: T, 
    operation: 'select' | 'insert' | 'update' | 'delete'
  ): 'high' | 'normal' | 'low' {
    // Trading operations get high priority
    if (table === 'trade_alerts' || table === 'market_prices') {
      return operation === 'select' ? 'high' : 'high';
    }
    
    // Real-time operations
    if (table === 'alert_monitoring' || table === 'notification_batch_queue') {
      return 'high';
    }
    
    // User operations get normal priority
    if (table === 'profiles' || table === 'device_subscriptions') {
      return 'normal';
    }
    
    // Everything else is low priority
    return 'low';
  }

  // Cache invalidation strategies
  private invalidateTableCache<T extends DatabaseTable>(table: T): void {
    // Invalidate all queries for this table
    redisCache.invalidatePattern(`query:${table}:*`);
    
    // Invalidate specific cache types based on table
    switch (table) {
      case 'trade_alerts':
        redisCache.invalidatePattern('active_signals:*');
        redisCache.invalidatePattern('signal:*');
        break;
      case 'market_prices':
        redisCache.invalidatePattern('prices:*');
        redisCache.invalidatePattern('price:*');
        break;
      case 'profiles':
        redisCache.invalidatePattern('subs:*');
        break;
    }
  }

  private invalidateRecordCache<T extends DatabaseTable>(table: T, id: string): void {
    // Invalidate specific record patterns
    redisCache.invalidatePattern(`*:${id}*`);
    
    // Also invalidate table-wide cache
    this.invalidateTableCache(table);
  }
}
