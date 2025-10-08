import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthorizationAware } from '@/hooks/useAuthorizationAware';

/**
 * ✅ SECURITY FIX (ERROR #19): Use secure RPC-based authorization
 * Replaced client-side checks with server-validated role checks
 */
export const AdminDebugButton: React.FC = () => {
  const { isAdmin } = useAuthorizationAware();
  
  // Return null to hide all debug functionality for clean dashboard
  return null;
};