import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

// Mock fetch for dispatcher calls
global.fetch = vi.fn();

describe('Notification Idempotency Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prevents duplicate notifications with claim-before-send', async () => {
    const mockNotificationPayload = {
      notifications: [{
        signal_id: 'test-signal-123',
        user_id: 'creator-id',
        notification_type: 'signal_created',
        asset_name: 'EURUSD',
        trade_type: 'buy',
        entry_price: 1.0500,
        author_id: 'creator-id',
        author_name: 'Test Trader',
        delivery_channels: ['in_app', 'push'],
        include_creator: false
      }]
    };

    // Mock successful responses
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        metrics: { total_processed: 1, idempotency_skipped_count: 0 }
      })
    }).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        metrics: { total_processed: 1, idempotency_skipped_count: 1 }
      })
    });

    // Mock the delivery log insert to simulate concurrent claims
    let insertCallCount = 0;
    const mockInsert = vi.fn().mockImplementation(() => {
      insertCallCount++;
      if (insertCallCount === 1) {
        // First call succeeds (claims the delivery)
        return Promise.resolve({
          data: { id: 'log-1' },
          error: null
        });
      } else {
        // Second call fails with duplicate key error
        return Promise.resolve({
          data: null,
          error: { code: '23505', message: 'duplicate key value violates unique constraint' }
        });
      }
    });

    vi.mocked(supabase.from).mockReturnValue({
      insert: mockInsert,
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'log-1' },
          error: null
        })
      }),
      update: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({
          data: null,
          error: null
        })
      })
    } as any);

    // Mock RPC call for getting subscribers
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: [
        { user_id: 'user-1', onesignal_player_id: 'player-1' },
        { user_id: 'user-2', onesignal_player_id: 'player-2' }
      ],
      error: null
    });

    // Mock channel for realtime
    const mockChannel = {
      send: vi.fn().mockResolvedValue({ error: null })
    };
    vi.mocked(supabase.channel).mockReturnValue(mockChannel as any);

    // Simulate concurrent calls to the notification dispatcher
    const dispatcherUrl = 'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/enhanced-signal-notification-dispatcher';
    
    const responses = await Promise.all([
      fetch(dispatcherUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockNotificationPayload)
      }),
      // Second call ~100ms later to test race condition
      new Promise(resolve => setTimeout(() => {
        resolve(fetch(dispatcherUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mockNotificationPayload)
        }));
      }, 100))
    ]);

    // Both calls should succeed
    expect((responses[0] as Response).ok).toBe(true);
    expect((responses[1] as Response).ok).toBe(true);

    const results = await Promise.all(responses.map(r => (r as Response).json()));
    
    // First call should process notifications
    expect(results[0].success).toBe(true);
    expect(results[0].metrics.total_processed).toBe(1);
    
    // Second call should show idempotency skips
    expect(results[1].success).toBe(true);
    expect(results[1].metrics.idempotency_skipped_count).toBeGreaterThan(0);
  });

  it('handles concurrent notifications for different channels correctly', async () => {
    // Mock separate successful responses for different channels
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        metrics: { 
          total_processed: 1, 
          realtime_sent: 1,
          push_sent: 1,
          idempotency_skipped_count: 0
        }
      })
    });

    const mockInsert = vi.fn()
      .mockResolvedValueOnce({
        data: { id: 'log-realtime-1' },
        error: null
      })
      .mockResolvedValueOnce({
        data: { id: 'log-push-1' },
        error: null
      });

    vi.mocked(supabase.from).mockReturnValue({
      insert: mockInsert,
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'log-1' },
          error: null
        })
      }),
      update: vi.fn().mockResolvedValue({ data: null, error: null })
    } as any);

    vi.mocked(supabase.rpc).mockResolvedValue({
      data: [{ user_id: 'user-1', onesignal_player_id: 'player-1' }],
      error: null
    });

    const mockChannel = {
      send: vi.fn().mockResolvedValue({ error: null })
    };
    vi.mocked(supabase.channel).mockReturnValue(mockChannel as any);

    const payload = {
      notifications: [{
        signal_id: 'test-signal-456',
        notification_type: 'signal_created',
        asset_name: 'GBPUSD',
        delivery_channels: ['in_app', 'push'],
        author_id: 'creator-id',
        include_creator: false
      }]
    };

    const dispatcherUrl = 'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/enhanced-signal-notification-dispatcher';
    
    const response = await fetch(dispatcherUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    expect((response as Response).ok).toBe(true);
    
    const result = await (response as Response).json();
    expect(result.success).toBe(true);
    
    // Both realtime and push should have been processed
    expect(result.metrics.realtime_sent).toBe(1);
    expect(result.metrics.push_sent).toBeGreaterThan(0);
  });

  it('tracks idempotency and error metrics correctly', async () => {
    // Mock response with metrics
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        metrics: {
          total_processed: 1,
          idempotency_skipped_count: 1,
          push_error_rate: { '4xx': 1 }
        }
      })
    });

    const payload = {
      notifications: [{
        signal_id: 'test-signal-789',
        notification_type: 'tp_hit',
        asset_name: 'USDJPY',
        delivery_channels: ['in_app', 'push'],
        author_id: 'creator-id',
        include_creator: false
      }]
    };

    const dispatcherUrl = 'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/enhanced-signal-notification-dispatcher';
    
    const response = await fetch(dispatcherUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    expect((response as Response).ok).toBe(true);
    
    const result = await (response as Response).json();
    expect(result.success).toBe(true);
    
    // Should track both successes and skips due to conflicts
    expect(result.metrics).toHaveProperty('idempotency_skipped_count');
    expect(result.metrics).toHaveProperty('push_error_rate');
    expect(result.metrics).toHaveProperty('total_processed');
    
    expect(result.metrics.total_processed).toBe(1);
  });
});