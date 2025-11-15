
import { User } from '@supabase/supabase-js';

export const cleanupAuthState = () => {
  console.log('🧹 Cleaning up all authentication state...');
  
  // ⚠️ IMPORTANT: DO NOT clear notification storage!
  const PROTECTED_KEYS = [
    'imperial-trade-notifications', // Recent Activity notifications MUST persist
  ];
  
  // Remove standard auth tokens
  localStorage.removeItem('supabase.auth.token');
  
  // Remove all Supabase auth keys from localStorage
  Object.keys(localStorage).forEach((key) => {
    // Skip protected keys
    if (PROTECTED_KEYS.includes(key)) {
      console.log(`🔒 [PROTECTED] Keeping localStorage key: ${key}`);
      return;
    }
    
    if (key.startsWith('supabase.auth.') || 
        key.includes('sb-') || 
        key.includes('auth') ||
        key.includes('imperial_auth') ||
        key.includes('session')) {
      localStorage.removeItem(key);
      console.log(`🧹 Removed localStorage key: ${key}`);
    }
  });
  
  // Remove Imperial welcome message flags
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('imperial_welcome_session_')) {
      localStorage.removeItem(key);
    }
  });
  
  // Clear all sessionStorage
  try {
    sessionStorage.clear();
    console.log('🧹 Cleared all sessionStorage');
  } catch (error) {
    console.warn('Failed to clear sessionStorage:', error);
  }
  
  console.log('✅ Authentication state cleanup complete (notifications preserved)');
};

export const handleAuthRedirect = (path: string) => {
  // Use React Router navigation instead of hard redirect for better UX
  window.history.pushState({}, '', path);
  window.location.reload();
};

// ============================================
// SECURITY FIX (ERROR #14-#44): Secure RPC-based authorization
// Replaced all client-side checks with server-validated role checks
// ============================================
import { supabase } from '@/integrations/supabase/client';

export const validateUserAccess = async (userId: string | null, requiredLevel: string): Promise<boolean> => {
  if (!userId) return false;
  
  try {
    const { data, error } = await supabase.rpc('get_user_roles', {
      p_user_id: userId
    });
    
    if (error) {
      console.error('🔒 [validateUserAccess] RPC error:', error);
      return false;
    }
    
    const roles = (data || []).map((r: any) => r.role);
    return roles.includes(requiredLevel);
  } catch (error) {
    console.error('🔒 [validateUserAccess] Unexpected error:', error);
    return false;
  }
};

export const hasAdminAccess = async (userId: string | null): Promise<boolean> => {
  if (!userId) return false;
  
  try {
    const { data, error } = await supabase.rpc('get_user_roles', {
      p_user_id: userId
    });
    
    if (error) {
      console.error('🔒 [hasAdminAccess] RPC error:', error);
      return false;
    }
    
    const roles = (data || []).map((r: any) => r.role);
    return roles.includes('admin');
  } catch (error) {
    console.error('🔒 [hasAdminAccess] Unexpected error:', error);
    return false;
  }
};

export const hasModeratorAccess = async (userId: string | null): Promise<boolean> => {
  if (!userId) return false;
  
  try {
    const { data, error } = await supabase.rpc('get_user_roles', {
      p_user_id: userId
    });
    
    if (error) {
      console.error('🔒 [hasModeratorAccess] RPC error:', error);
      return false;
    }
    
    const roles = (data || []).map((r: any) => r.role);
    return roles.includes('admin') || roles.includes('moderator');
  } catch (error) {
    console.error('🔒 [hasModeratorAccess] Unexpected error:', error);
    return false;
  }
};

export const canAccessAdminPanel = async (userId: string | null): Promise<boolean> => {
  return (await hasAdminAccess(userId)) || (await hasModeratorAccess(userId));
};

export const getUserDisplayName = (user: User | null): string => {
  if (!user) return 'Unknown User';
  
  if (user.user_metadata?.first_name && user.user_metadata?.last_name) {
    return `${user.user_metadata.first_name} ${user.user_metadata.last_name}`;
  }
  
  if (user.user_metadata?.full_name) {
    return user.user_metadata.full_name;
  }
  
  if (user.user_metadata?.display_name) {
    return user.user_metadata.display_name;
  }
  
  return user.email?.split('@')[0] || 'User';
};

export const formatUserRole = (role: string | null | undefined): string => {
  if (!role) return 'User';
  
  switch (role.toLowerCase()) {
    case 'admin':
      return 'Administrator';
    case 'moderator':
      return 'Moderator';
    case 'educator':
      return 'Educator';
    case 'user':
      return 'User';
    default:
      return 'Unknown';
  }
};
