
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { adminUserPartialUpdateSchema, createUserSchema } from '@/lib/validations/adminUserSchema';

export interface AdminUser {
  id: string;
  email: string;
  display_name: string;
  role: string;
  // DEPRECATED: Replaced by user_roles table
  user_type?: 'member' | 'educator' | 'admin';
  access_level?: 'user' | 'moderator' | 'admin';
  // NEW: Server-validated roles from user_roles table
  userRoles?: string[];
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

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      
      // Query profiles table and fetch roles using RPC
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;
      
      // Fetch roles for each user
      const usersWithRoles = await Promise.all(
        (profilesData || []).map(async (profile) => {
          const { data: rolesData } = await supabase.rpc('get_user_roles_array', {
            _user_id: profile.id
          });
          
          return {
            ...profile,
            userRoles: rolesData || []
          };
        })
      );
      
      console.log('Loaded users with roles:', usersWithRoles);
      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users: ' + (error as Error).message);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateUser = useCallback(async (userId: string, userData: Partial<AdminUser>) => {
    try {
      const validatedData = adminUserPartialUpdateSchema.parse(userData);
      console.log('Updating user with validated data:', validatedData);
      
      // Direct update to profiles table
      const { error } = await supabase
        .from('profiles')
        .update(validatedData)
        .eq('id', userId);

      if (error) throw error;
      
      toast.success('User updated successfully');
      await loadUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user: ' + (error as Error).message);
      throw error;
    }
  }, [loadUsers]);

  const deleteUser = useCallback(async (userId: string, userEmail: string) => {
    try {
      // Delete from profiles (cascade will handle related data)
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;
      
      toast.success('User deleted successfully');
      await loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user: ' + (error as Error).message);
      throw error;
    }
  }, [loadUsers]);

  const createUser = useCallback(async (userData: CreateUserData) => {
    try {
      const validatedData = createUserSchema.parse(userData);
      console.log('Creating user with validated data:', validatedData);
      
      // Use Supabase Auth Admin API to create user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: validatedData.email,
        password: validatedData.password,
        email_confirm: true,
        user_metadata: {
          display_name: validatedData.display_name,
          role: validatedData.role,
        }
      });

      if (authError) throw authError;
      
      // Profile will be created automatically by trigger
      // Update profile with additional fields
      if (authData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            user_type: validatedData.user_type,
            access_level: validatedData.access_level,
          })
          .eq('id', authData.user.id);

        if (profileError) throw profileError;
      }
      
      toast.success('User created successfully');
      await loadUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error('Failed to create user: ' + (error as Error).message);
      throw error;
    }
  }, [loadUsers]);

  const resetPassword = useCallback(async (userId: string, userEmail: string) => {
    try {
      // Send password reset email via Supabase Auth
      const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
      
      toast.success('Password reset email sent');
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error('Failed to send password reset email: ' + (error as Error).message);
      throw error;
    }
  }, []);

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
