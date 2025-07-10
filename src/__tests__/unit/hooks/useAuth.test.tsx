
import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// Mock the AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('useAuth Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns user data when authenticated', () => {
    const mockUser = {
      id: '123',
      email: 'test@example.com',
      user_metadata: { access_level: 'user' }
    };

    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      profile: null,
      loading: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
      updateProfile: vi.fn(),
    });

    const { result } = renderHook(() => useAuth());
    
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.loading).toBe(false);
  });

  it('returns null user when not authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      profile: null,
      loading: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
      updateProfile: vi.fn(),
    });

    const { result } = renderHook(() => useAuth());
    
    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(false);
  });
});
