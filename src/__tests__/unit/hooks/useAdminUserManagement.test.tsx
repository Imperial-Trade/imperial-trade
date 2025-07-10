
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

describe('useAdminUserManagement', () => {
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

  it('loads users successfully', async () => {
    mockSupabase.functions.invoke.mockResolvedValue({
      data: { users: mockUsers },
      error: null
    });

    const { result } = renderHook(() => useAdminUserManagement());

    await act(async () => {
      await result.current.loadUsers();
    });

    expect(result.current.users).toEqual(mockUsers);
    expect(result.current.loading).toBe(false);
    expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('admin-user-management', {
      body: { action: 'listUsers' },
      headers: { Authorization: 'Bearer mock-token' }
    });
  });

  it('handles load users error', async () => {
    const errorMessage = 'Failed to load users';
    mockSupabase.functions.invoke.mockResolvedValue({
      data: null,
      error: { message: errorMessage }
    });

    const { result } = renderHook(() => useAdminUserManagement());

    await act(async () => {
      await result.current.loadUsers();
    });

    expect(result.current.users).toEqual([]);
    expect(mockToast.error).toHaveBeenCalledWith(`Failed to load users: ${errorMessage}`);
  });

  it('updates user successfully', async () => {
    mockSupabase.functions.invoke
      .mockResolvedValueOnce({ data: { users: mockUsers }, error: null }) // loadUsers call
      .mockResolvedValueOnce({ data: { success: true }, error: null }); // updateUser call

    const { result } = renderHook(() => useAdminUserManagement());

    const updateData = { access_level: 'moderator' as const };

    await act(async () => {
      await result.current.updateUser('1', updateData);
    });

    expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('admin-user-management', {
      body: { action: 'updateUser', userId: '1', userData: updateData },
      headers: { Authorization: 'Bearer mock-token' }
    });
    expect(mockToast.success).toHaveBeenCalledWith('User updated successfully');
  });

  it('handles update user validation error', async () => {
    const { result } = renderHook(() => useAdminUserManagement());

    const invalidData = { invalid_field: 'invalid' };

    await act(async () => {
      try {
        await result.current.updateUser('1', invalidData as any);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    expect(mockToast.error).toHaveBeenCalledWith(expect.stringContaining('Failed to update user'));
  });

  it('creates user successfully', async () => {
    mockSupabase.functions.invoke
      .mockResolvedValueOnce({ data: { users: mockUsers }, error: null }) // loadUsers call
      .mockResolvedValueOnce({ data: { success: true }, error: null }); // createUser call

    const { result } = renderHook(() => useAdminUserManagement());

    const newUserData = {
      email: 'newuser@test.com',
      password: 'password123',
      display_name: 'New User',
      user_type: 'member' as const,
      access_level: 'user' as const,
      role: 'user'
    };

    await act(async () => {
      await result.current.createUser(newUserData);
    });

    expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('admin-user-management', {
      body: { action: 'createUser', userData: newUserData },
      headers: { Authorization: 'Bearer mock-token' }
    });
    expect(mockToast.success).toHaveBeenCalledWith('User created successfully');
  });

  it('deletes user successfully', async () => {
    mockSupabase.functions.invoke
      .mockResolvedValueOnce({ data: { users: mockUsers }, error: null }) // loadUsers call
      .mockResolvedValueOnce({ data: { success: true }, error: null }); // deleteUser call

    const { result } = renderHook(() => useAdminUserManagement());

    await act(async () => {
      await result.current.deleteUser('1', 'user1@test.com');
    });

    expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('admin-user-management', {
      body: { action: 'deleteUser', userId: '1', userData: { email: 'user1@test.com' } },
      headers: { Authorization: 'Bearer mock-token' }
    });
    expect(mockToast.success).toHaveBeenCalledWith('User deleted successfully');
  });

  it('resets password successfully', async () => {
    mockSupabase.functions.invoke.mockResolvedValue({
      data: { success: true },
      error: null
    });

    const { result } = renderHook(() => useAdminUserManagement());

    await act(async () => {
      await result.current.resetPassword('1', 'user1@test.com');
    });

    expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('admin-user-management', {
      body: { action: 'resetPassword', userId: '1', userData: { email: 'user1@test.com' } },
      headers: { Authorization: 'Bearer mock-token' }
    });
    expect(mockToast.success).toHaveBeenCalledWith('Password reset email sent');
  });

  it('handles authentication error', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null
    });

    const { result } = renderHook(() => useAdminUserManagement());

    await act(async () => {
      try {
        await result.current.loadUsers();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    expect(mockToast.error).toHaveBeenCalledWith(expect.stringContaining('Not authenticated'));
  });
});
