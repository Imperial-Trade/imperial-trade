import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NotificationSystem from '@/components/notifications/NotificationSystem';
import { notificationValidator } from '@/utils/notificationValidation';

// Mock the notification validator
vi.mock('@/utils/notificationValidation', () => ({
  notificationValidator: {
    validateSignalChange: vi.fn(),
    checkNotificationRateLimit: vi.fn(),
    performHealthCheck: vi.fn()
  }
}));

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      like: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn()
    })),
    removeChannel: vi.fn()
  }
}));

// Mock services
vi.mock('@/services/NotificationService', () => ({
  notificationService: {
    recordNotificationDelivery: vi.fn()
  }
}));

describe('NotificationAccuracy', () => {
  let queryClient: QueryClient;
  let mockValidateSignalChange: any;
  let mockCheckRateLimit: any;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
    });

    mockValidateSignalChange = vi.mocked(notificationValidator.validateSignalChange);
    mockCheckRateLimit = vi.mocked(notificationValidator.checkNotificationRateLimit);

    // Reset window global
    delete (window as any).addNotification;
    delete (window as any).lastShownMap;

    vi.clearAllMocks();
  });

  afterEach(() => {
    delete (window as any).addNotification;
    delete (window as any).lastShownMap;
  });

  const renderNotificationSystem = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <NotificationSystem />
      </QueryClientProvider>
    );
  };

  describe('Signal Change Validation', () => {
    it('should block notifications when validation fails', async () => {
      mockValidateSignalChange.mockResolvedValue({
        isValid: false,
        reason: 'No actual changes detected',
        changeSource: 'unknown',
        riskLevel: 'high'
      });

      renderNotificationSystem();

      const mockNotification = {
        id: 'test-1',
        type: 'signal_updated',
        title: 'Signal Update - Gold',
        message: 'Your signal has been updated',
        metadata: {
          signal_id: 'signal-123',
          change_types: ['notes_updated'],
          old_data: { notes: 'old notes' },
          new_data: { notes: 'new notes' }
        }
      };

      // Add notification
      if ((window as any).addNotification) {
        await (window as any).addNotification(mockNotification);
      }

      // Should not show notification due to validation failure
      expect(screen.queryByText('Signal Update - Gold')).not.toBeInTheDocument();
      expect(mockValidateSignalChange).toHaveBeenCalledWith({
        signalId: 'signal-123',
        oldData: { notes: 'old notes' },
        newData: { notes: 'new notes' },
        changeTypes: ['notes_updated'],
        timestamp: expect.any(Date)
      });
    });

    it('should allow notifications when validation passes', async () => {
      mockValidateSignalChange.mockResolvedValue({
        isValid: true,
        actualChanges: { status: { old: 'active', new: 'closed' } },
        changeSource: 'user_update',
        riskLevel: 'low'
      });
      mockCheckRateLimit.mockResolvedValue(true);

      renderNotificationSystem();

      const mockNotification = {
        id: 'test-2',
        type: 'signal_updated',
        title: 'Signal Closed - Gold',
        message: 'Your signal has been closed',
        metadata: {
          signal_id: 'signal-456',
          change_types: ['status_change'],
          old_data: { status: 'active' },
          new_data: { status: 'closed' }
        }
      };

      // Add notification
      if ((window as any).addNotification) {
        await (window as any).addNotification(mockNotification);
      }

      // Should show notification after validation passes
      await waitFor(() => {
        expect(screen.getByText('Signal Closed - Gold')).toBeInTheDocument();
      });
    });

    it('should block notifications due to rate limiting', async () => {
      mockValidateSignalChange.mockResolvedValue({
        isValid: true,
        actualChanges: { tp_hits: { old: [1], new: [1, 2] } },
        changeSource: 'system_update',
        riskLevel: 'low'
      });
      mockCheckRateLimit.mockResolvedValue(false); // Rate limit exceeded

      renderNotificationSystem();

      const mockNotification = {
        id: 'test-3',
        type: 'tp_hit',
        title: 'TP2 Hit - Gold',
        message: 'Take profit 2 has been hit',
        metadata: {
          signal_id: 'signal-789',
          change_types: ['tp_hits']
        }
      };

      // Add notification
      if ((window as any).addNotification) {
        await (window as any).addNotification(mockNotification);
      }

      // Should not show notification due to rate limiting
      expect(screen.queryByText('TP2 Hit - Gold')).not.toBeInTheDocument();
      expect(mockCheckRateLimit).toHaveBeenCalledWith('signal-789');
    });
  });

  describe('Phantom Notification Prevention', () => {
    it('should prevent duplicate notifications within 120 seconds', async () => {
      mockValidateSignalChange.mockResolvedValue({
        isValid: true,
        actualChanges: { status: { old: 'pending', new: 'active' } },
        changeSource: 'user_update',
        riskLevel: 'low'
      });
      mockCheckRateLimit.mockResolvedValue(true);

      renderNotificationSystem();

      const baseNotification = {
        id: 'test-4',
        type: 'signal_updated',
        title: 'Signal Activated - Gold',
        message: 'Your signal is now active',
        eventKey: 'unique-event-key-123'
      };

      // Add first notification
      if ((window as any).addNotification) {
        await (window as any).addNotification(baseNotification);
      }

      // Should show first notification
      await waitFor(() => {
        expect(screen.getByText('Signal Activated - Gold')).toBeInTheDocument();
      });

      // Try to add duplicate notification immediately
      if ((window as any).addNotification) {
        await (window as any).addNotification({
          ...baseNotification,
          id: 'test-5' // Different ID but same eventKey
        });
      }

      // Should not show duplicate
      const notifications = screen.getAllByText('Signal Activated - Gold');
      expect(notifications).toHaveLength(1);
    });
  });

  describe('False Positive Detection', () => {
    it('should detect and block phantom TP hit notifications', async () => {
      mockValidateSignalChange.mockResolvedValue({
        isValid: false,
        reason: 'TP hits array did not increase',
        changeSource: 'system_update',
        riskLevel: 'high'
      });

      renderNotificationSystem();

      const phantomTPNotification = {
        id: 'phantom-tp',
        type: 'tp_hit',
        title: 'TP Hit - Gold',
        message: 'Take profit has been hit',
        metadata: {
          signal_id: 'signal-phantom',
          change_types: ['tp_hits'],
          old_data: { tp_hits: [1, 2] },
          new_data: { tp_hits: [1, 2] } // No actual change
        }
      };

      if ((window as any).addNotification) {
        await (window as any).addNotification(phantomTPNotification);
      }

      // Should be blocked
      expect(screen.queryByText('TP Hit - Gold')).not.toBeInTheDocument();
    });

    it('should detect and block phantom status change notifications', async () => {
      mockValidateSignalChange.mockResolvedValue({
        isValid: false,
        reason: 'Invalid status transition: closed -> closed',
        changeSource: 'system_update',
        riskLevel: 'medium'
      });

      renderNotificationSystem();

      const phantomStatusNotification = {
        id: 'phantom-status',
        type: 'signal_updated',
        title: 'Signal Updated - Gold',
        message: 'Your signal has been updated',
        metadata: {
          signal_id: 'signal-phantom-status',
          change_types: ['status_change'],
          old_data: { status: 'closed' },
          new_data: { status: 'closed' } // No actual change
        }
      };

      if ((window as any).addNotification) {
        await (window as any).addNotification(phantomStatusNotification);
      }

      // Should be blocked
      expect(screen.queryByText('Signal Updated - Gold')).not.toBeInTheDocument();
    });
  });
});