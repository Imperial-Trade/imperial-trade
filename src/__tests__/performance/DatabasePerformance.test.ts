
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { performance } from 'perf_hooks';
import { enhancedApiClient } from '@/api/client/EnhancedApiClient';
import { supabase } from '@/integrations/supabase/client';
import { TestDataFactory } from '@/__tests__/utils/testDataFactory';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      eq: vi.fn(),
      limit: vi.fn(),
      order: vi.fn()
    }))
  }
}));

describe('Database Performance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Query Performance', () => {
    it('should execute select queries within acceptable time', async () => {
      const mockData = TestDataFactory.createMultipleTradeAlerts(10);
      
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: mockData,
          error: null
        }),
        insert: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        eq: vi.fn(),
        limit: vi.fn(),
        order: vi.fn()
      } as any);

      const startTime = performance.now();
      
      const result = await enhancedApiClient.select('trade_alerts', {
        limit: 10,
        order: { column: 'created_at', ascending: false }
      });

      const endTime = performance.now();
      const queryTime = endTime - startTime;

      expect(result.success).toBe(true);
      expect(queryTime).toBeLessThan(100); // Query should complete under 100ms
    });

    it('should handle bulk operations efficiently', async () => {
      const mockData = TestDataFactory.createMultipleTradeAlerts(100);
      
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: mockData,
          error: null
        }),
        insert: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        eq: vi.fn(),
        limit: vi.fn(),
        order: vi.fn()
      } as any);

      const startTime = performance.now();
      
      // Simulate multiple concurrent queries
      const promises = Array.from({ length: 5 }, () =>
        enhancedApiClient.select('trade_alerts', { limit: 20 })
      );

      const results = await Promise.all(promises);
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(results.every(r => r.success)).toBe(true);
      expect(totalTime).toBeLessThan(300); // 5 concurrent queries under 300ms
    });

    it('should efficiently handle request deduplication', async () => {
      const mockData = TestDataFactory.createMultipleTradeAlerts(5);
      const mockSelect = vi.fn().mockResolvedValue({
        data: mockData,
        error: null
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        insert: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        eq: vi.fn(),
        limit: vi.fn(),
        order: vi.fn()
      } as any);

      // Make identical requests simultaneously
      const promises = Array.from({ length: 3 }, () =>
        enhancedApiClient.select('trade_alerts', { limit: 5 })
      );

      const results = await Promise.all(promises);
      
      // All requests should succeed
      expect(results.every(r => r.success)).toBe(true);
      
      // Should have made only one actual database call due to deduplication
      expect(mockSelect).toHaveBeenCalledTimes(1);
    });
  });

  describe('Connection Pool Performance', () => {
    it('should handle rapid successive queries', async () => {
      const mockData = [TestDataFactory.createTradeAlert()];
      
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: mockData,
          error: null
        }),
        insert: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        eq: vi.fn(),
        limit: vi.fn(),
        order: vi.fn()
      } as any);

      const startTime = performance.now();
      
      // Execute 20 rapid queries
      for (let i = 0; i < 20; i++) {
        await enhancedApiClient.select('trade_alerts', { limit: 1 });
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // 20 queries should complete under 1 second
      expect(totalTime).toBeLessThan(1000);
    });
  });
});
