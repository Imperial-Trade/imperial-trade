
import { supabase } from '@/integrations/supabase/client';

export class AuthorizationService {
  private static instance: AuthorizationService;

  private constructor() {}

  static getInstance(): AuthorizationService {
    if (!AuthorizationService.instance) {
      AuthorizationService.instance = new AuthorizationService();
    }
    return AuthorizationService.instance;
  }

  /**
   * Check if current user is admin using secure database function
   */
  async isAdmin(): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('is_admin');
      if (error) {
        console.error('Error checking admin status:', error);
        return false;
      }
      return data === true;
    } catch (error) {
      console.error('Error in isAdmin check:', error);
      return false;
    }
  }

  /**
   * Check if current user is moderator or admin using secure database function
   */
  async isModeratorOrAdmin(): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('is_moderator_or_admin');
      if (error) {
        console.error('Error checking moderator/admin status:', error);
        return false;
      }
      return data === true;
    } catch (error) {
      console.error('Error in isModeratorOrAdmin check:', error);
      return false;
    }
  }

  /**
   * Check if current user is educator or admin using secure database function
   */
  async isEducatorOrAdmin(): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('is_educator_or_admin');
      if (error) {
        console.error('Error checking educator/admin status:', error);
        return false;
      }
      return data === true;
    } catch (error) {
      console.error('Error in isEducatorOrAdmin check:', error);
      return false;
    }
  }

  /**
   * Get user access level using secure database function
   */
  async getUserAccessLevel(userId?: string): Promise<string | null> {
    try {
      const { data, error } = await supabase.rpc('get_user_access_level', {
        user_id_param: userId || undefined
      });
      if (error) {
        console.error('Error getting user access level:', error);
        return null;
      }
      return data;
    } catch (error) {
      console.error('Error in getUserAccessLevel:', error);
      return null;
    }
  }

  /**
   * Get user role using secure database function
   */
  async getUserRole(userId?: string): Promise<string | null> {
    try {
      const { data, error } = await supabase.rpc('get_user_role', {
        user_id_param: userId || undefined
      });
      if (error) {
        console.error('Error getting user role:', error);
        return null;
      }
      return data;
    } catch (error) {
      console.error('Error in getUserRole:', error);
      return null;
    }
  }

  /**
   * Get user type using secure database function
   */
  async getUserType(userId?: string): Promise<string | null> {
    try {
      const { data, error } = await supabase.rpc('get_user_type', {
        user_id_param: userId || undefined
      });
      if (error) {
        console.error('Error getting user type:', error);
        return null;
      }
      return data;
    } catch (error) {
      console.error('Error in getUserType:', error);
      return null;
    }
  }

  /**
   * Check if user has specific role using secure database function
   */
  async hasRole(userId: string, role: 'admin' | 'moderator' | 'user'): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('has_role', {
        _user_id: userId,
        _role: role
      });
      if (error) {
        console.error('Error checking user role:', error);
        return false;
      }
      return data === true;
    } catch (error) {
      console.error('Error in hasRole check:', error);
      return false;
    }
  }
}

export const authorizationService = AuthorizationService.getInstance();
