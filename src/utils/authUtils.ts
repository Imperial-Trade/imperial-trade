
import { User } from '@supabase/supabase-js';

export const cleanupAuthState = () => {
  // Remove standard auth tokens
  localStorage.removeItem('supabase.auth.token');
  
  // Remove all Supabase auth keys from localStorage
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      localStorage.removeItem(key);
    }
  });
  
  // Remove from sessionStorage if in use
  Object.keys(sessionStorage || {}).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      sessionStorage.removeItem(key);
    }
  });
};

export const handleAuthRedirect = (path: string) => {
  // Use React Router navigation instead of hard redirect for better UX
  window.history.pushState({}, '', path);
  window.location.reload();
};

export const validateUserAccess = (user: User | null, requiredLevel: string): boolean => {
  if (!user || !user.user_metadata) return false;
  
  const userAccessLevel = user.user_metadata.access_level;
  const userRole = user.user_metadata.role;
  
  // Check if user has the required access level or role
  return userAccessLevel === requiredLevel || userRole === requiredLevel;
};

export const hasAdminAccess = (user: User | null): boolean => {
  if (!user || !user.user_metadata) return false;
  
  return user.user_metadata.access_level === 'admin' || user.user_metadata.role === 'admin';
};

export const hasModeratorAccess = (user: User | null): boolean => {
  if (!user || !user.user_metadata) return false;
  
  const accessLevel = user.user_metadata.access_level;
  const role = user.user_metadata.role;
  
  // Admin has moderator privileges, plus explicit moderator access
  return accessLevel === 'admin' || accessLevel === 'moderator' || 
         role === 'admin' || role === 'moderator';
};

export const canAccessAdminPanel = (user: User | null): boolean => {
  return hasAdminAccess(user) || hasModeratorAccess(user);
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
