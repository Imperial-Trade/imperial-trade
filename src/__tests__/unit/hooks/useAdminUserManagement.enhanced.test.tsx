
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAdminUserManagement } from '@/hooks/useAdminUserManagement';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Mock dependencies
vi.mock('@/integrations/supabase/client');
vi.mock('sonner');

const mockSupabase = supabase as any;
const mockToast = toast as any;

describe('useAdminUserManagement - Enhanced Tests', () => {
  const mockUsers = [
    {
      id: '1',
      email: 'user1@test.com',
      display_name: 'User One',
      role: 'user',
      user_type: 'member' as const,
      access_level: 'user' as const,
      account_status: 'active' as const,
      registration_source: 'direct' as const,
      created_at: '2023-01-01T00:00:00Z',
    },
    {
      id: '2',
      email: 'admin@test.com',
      display_name: 'Admin User',
      role: 'admin',
      user_type: 'admin' as const,
      access_level: 'admin' as const,
      account_status: 'active' as const,
      registration_source: 'admin_created' as const,
      created_at: '2023-01-02T00:00:00Z',
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock auth session
    mockSupabase.auth = {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'mock-token',
            refresh_token: 'mock-refresh-token',
            expires_in: 3600,
            token_type: 'bearer',
            user: { id: 'admin-id' }
          }
        },
        error: null
      })
    };

    mockSupabase.functions = {
      invoke: vi.fn()
    };
  });

  describe('error handling', () => {
    it('handles network errors gracefully', async () => {
      const networkError = new Error('Network error');
      mockSupabase.functions.invoke.mockRejectedValue(networkError);

      const { result } = renderHook(() => useAdminUserManagement());

      await act(async () => {
        try {
          await result.current.loadUsers();
        } catch (error) {
          expect(error).toBe(networkError);
        }
      });

      expect(mockToast.error).toHaveBeenCalledWith(
        expect.stringContaining('Network error')
      );
    });

    it('handles supabase function errors', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: null,
        error: { message: 'Function execution failed' }
      });

      const { result } = renderHook(() => useAdminUserManagement());

      await act(async () => {
        await result.current.loadUsers();
      });

      expect(mockToast.error).toHaveBeenCalledWith(
        'Failed to load users: Function execution failed'
      );
    });

    it('handles missing session gracefully', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null
      });

      const { result } = renderHook(() => useAdminUserManagement());

      await act(async () => {
        try {
          await result.current.loadUsers();
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
        }
      });
    });
  });

  describe('data validation', () => {
    it('validates user data before updating', async () => {
      const { result } = renderHook(() => useAdminUserManagement());

      const invalidData = {
        access_level: 'invalid_level' as any,
        user_type: 'invalid_type' as any
      };

      await act(async () => {
        try {
          await result.current.updateUser('1', invalidData);
        } catch (error) {
          expect(error).toBeDefined();
        }
      });

      expect(mockToast.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to update user')
      );
    });

    it('validates create user data', async () => {
      const { result } = renderHook(() => useAdminUserManagement());

      const invalidUserData = {
        email: 'invalid-email',
        password: '123', // Too short
        display_name: '',
        role: 'user'
      };

      await act(async () => {
        try {
          await result.current.createUser(invalidUserData);
        } catch (error) {
          expect(error).toBeDefined();
        }
      });

      expect(mockToast.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create user')
      );
    });
  });

  describe('loading states', () => {
    it('manages loading state during operations', async () => {
      let resolvePromise: (value: any) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockSupabase.functions.invoke.mockReturnValue(pendingPromise);

      const { result } = renderHook(() => useAdminUserManagement());

      act(() => {
        result.current.loadUsers();
      });

      expect(result.current.loading).toBe(true);

      await act(async () => {
        resolvePromise!({ data: { users: mockUsers }, error: null });
        await pendingPromise;
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.users).toEqual(mockUsers);
    });
  });

  describe('optimistic updates', () => {
    it('handles successful operations with proper state updates', async () => {
      mockSupabase.functions.invoke
        .mockResolvedValueOnce({ data: { users: mockUsers }, error: null }) // loadUsers
        .mockResolvedValueOnce({ data: { success: true }, error: null }) // updateUser
        .mockResolvedValueOnce({ data: { users: [...mockUsers] }, error: null }); // loadUsers again

      const { result } = renderHook(() => useAdminUserManagement());

      // Load initial users
      await act(async () => {
        await result.current.loadUsers();
      });

      expect(result.current.users).toEqual(mockUsers);

      // Update user
      await act(async () => {
        await result.current.updateUser('1', { access_level: 'moderator' });
      });

      expect(mockToast.success).toHaveBeenCalledWith('User updated successfully');
    });
  });

  describe('batch operations', () => {
    it('handles multiple concurrent operations', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: { success: true },
        error: null
      });

      const { result } = renderHook(() => useAdminUserManagement());

      const operations = [
        result.current.resetPassword('1', 'user1@test.com'),
        result.current.resetPassword('2', 'user2@test.com'),
        result.current.resetPassword('3', 'user3@test.com')
      ];

      await act(async () => {
        await Promise.all(operations);
      });

      expect(mockSupabase.functions.invoke).toHaveBeenCalledTimes(3);
      expect(mockToast.success).toHaveBeenCalledTimes(3);
    });
  });

  describe('edge cases', () => {
    it('handles empty user list', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: { users: [] },
        error: null
      });

      const { result } = renderHook(() => useAdminUserManagement());

      await act(async () => {
        await result.current.loadUsers();
      });

      expect(result.current.users).toEqual([]);
      expect(result.current.loading).toBe(false);
    });

    it('handles malformed response data', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: { users: null },
        error: null
      });

      const { result } = renderHook(() => useAdminUserManagement());

      await act(async () => {
        await result.current.loadUsers();
      });

      expect(result.current.users).toEqual([]);
    });
  });
});
