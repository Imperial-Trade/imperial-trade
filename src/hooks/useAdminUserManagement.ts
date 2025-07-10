
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AdminUser {
  id: string;
  email: string;
  display_name: string;
  role: string;
  user_type: 'member' | 'educator' | 'admin';
  access_level: 'user' | 'moderator' | 'admin';
  account_status: 'active' | 'suspended' | 'pending_verification' | 'inactive';
  registration_source: 'direct' | 'account_request' | 'social' | 'admin_created' | 'invitation';
  phone_number?: string;
  last_login?: string;
  created_at: string;
  email_confirmed_at?: string;
  approved_at?: string;
  approved_by?: string;
}

export interface CreateUserData {
  email: string;
  password: string;
  display_name: string;
  role: string;
  access_level: 'user' | 'moderator' | 'admin';
  user_type: 'member' | 'educator' | 'admin';
}

export const useAdminUserManagement = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);

  const callAdminFunction = useCallback(async (action: string, userId?: string, userData?: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await supabase.functions.invoke('admin-user-management', {
      body: { action, userId, userData },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (response.error) {
      throw new Error(response.error.message || 'Admin operation failed');
    }

    return response.data;
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await callAdminFunction('listUsers');
      setUsers(data.users);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [callAdminFunction]);

  const updateUser = useCallback(async (userId: string, userData: Partial<AdminUser>) => {
    try {
      await callAdminFunction('updateUser', userId, userData);
      toast.success('User updated successfully');
      await loadUsers(); // Refresh the list
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
    }
  }, [callAdminFunction, loadUsers]);

  const deleteUser = useCallback(async (userId: string, userEmail: string) => {
    try {
      await callAdminFunction('deleteUser', userId, { email: userEmail });
      toast.success('User deleted successfully');
      await loadUsers(); // Refresh the list
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  }, [callAdminFunction, loadUsers]);

  const createUser = useCallback(async (userData: CreateUserData) => {
    try {
      await callAdminFunction('createUser', undefined, userData);
      toast.success('User created successfully');
      await loadUsers(); // Refresh the list
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error('Failed to create user');
    }
  }, [callAdminFunction, loadUsers]);

  const resetPassword = useCallback(async (userId: string, userEmail: string) => {
    try {
      await callAdminFunction('resetPassword', userId, { email: userEmail });
      toast.success('Password reset email sent');
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error('Failed to send password reset email');
    }
  }, [callAdminFunction]);

  return {
    users,
    loading,
    loadUsers,
    updateUser,
    deleteUser,
    createUser,
    resetPassword,
  };
};
