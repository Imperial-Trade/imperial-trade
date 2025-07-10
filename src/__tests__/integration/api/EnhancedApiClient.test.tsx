
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EnhancedApiClient } from '@/api/client/EnhancedApiClient';
import { supabase } from '@/integrations/supabase/client';

describe('EnhancedApiClient Integration', () => {
  let apiClient: EnhancedApiClient;

  beforeEach(() => {
    vi.clearAllMocks();
    apiClient = EnhancedApiClient.getInstance();
  });

  it('handles database operations with retry and timeout', async () => {
    const mockData = [
      { id: '1', asset_name: 'EURUSD', entry_price: 1.0500 }
    ];

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: mockData,
        error: null
      })
    } as any);

    const result = await apiClient.select('trade_alerts', {
      limit: 10,
      order: { column: 'created_at', ascending: false }
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockData);
  });

  it('handles network errors with proper retry logic', async () => {
    const networkError = new Error('Network timeout');
    
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockRejectedValue(networkError)
    } as any);

    const result = await apiClient.select('trade_alerts', {}, {
      retries: 2,
      timeout: 1000
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Network timeout');
  });

  it('manages request queue properly', async () => {
    const mockData = [{ id: '1', name: 'Test' }];
    
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: mockData,
        error: null
      })
    } as any);

    // Make two identical requests
    const promise1 = apiClient.select('profiles', { limit: 5 });
    const promise2 = apiClient.select('profiles', { limit: 5 });

    const [result1, result2] = await Promise.all([promise1, promise2]);

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    expect(apiClient.getPendingRequestCount()).toBe(0);
  });

  it('cancels requests properly', async () => {
    const slowPromise = new Promise((resolve) => {
      setTimeout(() => resolve({ data: [], error: null }), 2000);
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue(slowPromise)
    } as any);

    const requestPromise = apiClient.select('trade_alerts');
    
    // Cancel all requests immediately
    apiClient.cancelAllRequests();
    
    expect(apiClient.getPendingRequestCount()).toBe(0);
  });
});
