
import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

// Mock the AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('useAuth Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns user data when authenticated', () => {
    const mockUser: Partial<User> = {
      id: '123',
      email: 'test@example.com',
      user_metadata: { access_level: 'user' },
      app_metadata: {},
      aud: 'authenticated',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
      email_confirmed_at: '2023-01-01T00:00:00Z',
    };

    vi.mocked(useAuth).mockReturnValue({
      user: mockUser as User,
      session: null,
      profile: null,
      loading: false,
      profileLoading: false,
      signOut: vi.fn(),
      refreshSession: vi.fn(),
      refreshProfile: vi.fn(),
      isXeonStreamSubscribed: false,
      updateXeonStreamSubscription: vi.fn(),
    });

    const { result } = renderHook(() => useAuth());
    
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.loading).toBe(false);
  });

  it('returns null user when not authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      session: null,
      profile: null,
      loading: false,
      profileLoading: false,
      signOut: vi.fn(),
      refreshSession: vi.fn(),
      refreshProfile: vi.fn(),
      isXeonStreamSubscribed: false,
      updateXeonStreamSubscription: vi.fn(),
    });

    const { result } = renderHook(() => useAuth());
    
    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(false);
  });
});
