
import { describe, it, expect } from 'vitest';
import { User } from '@supabase/supabase-js';
import { 
  validateUserAccess, 
  hasAdminAccess, 
  hasModeratorAccess,
  canAccessAdminPanel,
  getUserDisplayName,
  formatUserRole 
} from '@/utils/authUtils';

describe('Auth Utils', () => {
  const createMockUser = (overrides: Partial<User> = {}): User => ({
    id: '123',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'test@example.com',
    email_confirmed_at: '2023-01-01T00:00:00.000Z',
    phone: null,
    confirmed_at: '2023-01-01T00:00:00.000Z',
    last_sign_in_at: '2023-01-01T00:00:00.000Z',
    app_metadata: {},
    user_metadata: {
      access_level: 'user',
      role: 'user'
    },
    identities: [],
    created_at: '2023-01-01T00:00:00.000Z',
    updated_at: '2023-01-01T00:00:00.000Z',
    ...overrides
  });

  const mockUser = createMockUser();

  const mockAdminUser = createMockUser({
    id: '456',
    email: 'admin@example.com',
    user_metadata: {
      access_level: 'admin',
      role: 'admin'
    }
  });

  const mockModeratorUser = createMockUser({
    id: '789',
    email: 'mod@example.com',
    user_metadata: {
      access_level: 'moderator',
      role: 'moderator'
    }
  });

  describe('validateUserAccess', () => {
    it('returns true for valid user with matching access level', async () => {
      await expect(validateUserAccess(mockUser.id, 'user')).resolves.toBe(true);
    });

    it('returns false for user without required access level', async () => {
      await expect(validateUserAccess(mockUser.id, 'admin')).resolves.toBe(false);
    });

    it('returns false for null user', async () => {
      await expect(validateUserAccess(null, 'user')).resolves.toBe(false);
    });

    it('returns false for user without metadata', async () => {
      const userWithoutMetadata = createMockUser({
        user_metadata: undefined as any
      });
      await expect(validateUserAccess(userWithoutMetadata.id, 'user')).resolves.toBe(false);
    });
  });

  describe('hasAdminAccess', () => {
    it('returns true for admin user', async () => {
      await expect(hasAdminAccess(mockAdminUser.id)).resolves.toBe(true);
    });

    it('returns false for regular user', async () => {
      await expect(hasAdminAccess(mockUser.id)).resolves.toBe(false);
    });

    it('returns false for moderator user', async () => {
      await expect(hasAdminAccess(mockModeratorUser.id)).resolves.toBe(false);
    });

    it('returns false for null user', async () => {
      await expect(hasAdminAccess(null)).resolves.toBe(false);
    });
  });

  describe('hasModeratorAccess', () => {
    it('returns true for moderator user', async () => {
      await expect(hasModeratorAccess(mockModeratorUser.id)).resolves.toBe(true);
    });

    it('returns true for admin user (admin has moderator privileges)', async () => {
      await expect(hasModeratorAccess(mockAdminUser.id)).resolves.toBe(true);
    });

    it('returns false for regular user', async () => {
      await expect(hasModeratorAccess(mockUser.id)).resolves.toBe(false);
    });

    it('returns false for null user', async () => {
      await expect(hasModeratorAccess(null)).resolves.toBe(false);
    });
  });

  describe('canAccessAdminPanel', () => {
    it('returns true for admin user', async () => {
      await expect(canAccessAdminPanel(mockAdminUser.id)).resolves.toBe(true);
    });

    it('returns true for moderator user', async () => {
      await expect(canAccessAdminPanel(mockModeratorUser.id)).resolves.toBe(true);
    });

    it('returns false for regular user', async () => {
      await expect(canAccessAdminPanel(mockUser.id)).resolves.toBe(false);
    });

    it('returns false for null user', async () => {
      await expect(canAccessAdminPanel(null)).resolves.toBe(false);
    });
  });

  describe('getUserDisplayName', () => {
    it('returns display name from metadata', () => {
      const userWithDisplayName = createMockUser({
        user_metadata: {
          display_name: 'John Doe',
          access_level: 'user',
          role: 'user'
        }
      });
      expect(getUserDisplayName(userWithDisplayName)).toBe('John Doe');
    });

    it('returns full name from metadata if no display name', () => {
      const userWithFullName = createMockUser({
        user_metadata: {
          full_name: 'Jane Smith',
          access_level: 'user',
          role: 'user'
        }
      });
      expect(getUserDisplayName(userWithFullName)).toBe('Jane Smith');
    });

    it('returns email if no display name or full name', () => {
      expect(getUserDisplayName(mockUser)).toBe('test@example.com');
    });

    it('returns "Unknown User" for null user', () => {
      expect(getUserDisplayName(null)).toBe('Unknown User');
    });
  });

  describe('formatUserRole', () => {
    it('formats admin role correctly', () => {
      expect(formatUserRole('admin')).toBe('Administrator');
    });

    it('formats moderator role correctly', () => {
      expect(formatUserRole('moderator')).toBe('Moderator');
    });

    it('formats educator role correctly', () => {
      expect(formatUserRole('educator')).toBe('Educator');
    });

    it('formats user role correctly', () => {
      expect(formatUserRole('user')).toBe('User');
    });

    it('handles unknown roles', () => {
      expect(formatUserRole('unknown')).toBe('Unknown');
    });

    it('handles null/undefined roles', () => {
      expect(formatUserRole(null as any)).toBe('User');
      expect(formatUserRole(undefined as any)).toBe('User');
    });
  });
});
