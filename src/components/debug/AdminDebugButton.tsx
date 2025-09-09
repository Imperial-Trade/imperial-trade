import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

export const AdminDebugButton: React.FC = () => {
  const { profile, user } = useAuth();
  
  // Admin-only access - component disabled for clean dashboard
  const isAdmin = profile?.access_level === 'admin' || user?.user_metadata?.access_level === 'admin';
  
  // Return null to hide all debug functionality for clean dashboard
  return null;
};