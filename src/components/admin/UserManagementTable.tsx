
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { adminAuditService } from '@/api/services/AdminAuditService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  Users, 
  Search, 
  Filter, 
  Shield, 
  UserX, 
  RefreshCw,
  Crown,
  User
} from 'lucide-react';

interface UserData {
  id: string;
  email: string;
  display_name?: string;
  role?: string;
  created_at: string;
  last_sign_in_at?: string;
  email_confirmed_at?: string;
}

export function UserManagementTable() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    getCurrentUser();
    loadUsers();
  }, []);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      // Get auth users (this requires admin privileges)
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) {
        console.error('Error loading auth users:', authError);
        return;
      }

      // Get profiles data
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) {
        console.error('Error loading profiles:', profilesError);
      }

      // Combine auth data with profile data and fetch authoritative roles from user_roles table
      const combinedUsers = await Promise.all(
        authUsers.users.map(async (user) => {
          const profile = profiles?.find(p => p.id === user.id);
          
          // ✅ SECURITY FIX (ERROR #48): Fetch authoritative roles from user_roles table
          const { data: userRolesData } = await supabase.rpc('get_user_roles', { 
            p_user_id: user.id 
          });
          const roles = userRolesData?.map((r: any) => r.role).join(', ') || 'user';
          
          return {
            id: user.id,
            email: user.email || '',
            display_name: profile?.display_name || user.user_metadata?.full_name || 'Unknown',
            role: roles,
            created_at: user.created_at,
            last_sign_in_at: user.last_sign_in_at,
            email_confirmed_at: user.email_confirmed_at,
          };
        })
      );

      setUsers(combinedUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      // Update in profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          role: newRole,
          updated_at: new Date().toISOString()
        });

      if (profileError) {
        console.error('Error updating profile:', profileError);
        return;
      }

      // Update in auth metadata
      const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
        user_metadata: { role: newRole }
      });

      if (authError) {
        console.error('Error updating auth metadata:', authError);
      }

      // Log the action
      if (currentUser) {
        await adminAuditService.logAdminAction(
          'update_user_role',
          currentUser.email || 'unknown',
          'user',
          userId,
          { old_role: users.find(u => u.id === userId)?.role, new_role: newRole }
        );
      }

      // Reload users to show updated data
      loadUsers();
    } catch (error) {
      console.error('Error updating user role:', error);
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      const { error } = await supabase.auth.admin.deleteUser(userId);
      
      if (error) {
        console.error('Error deleting user:', error);
        return;
      }

      // Log the action
      if (currentUser) {
        await adminAuditService.logAdminAction(
          'delete_user',
          currentUser.email || 'unknown',
          'user',
          userId,
          { deleted_user_email: users.find(u => u.id === userId)?.email }
        );
      }

      // Reload users
      loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const getRoleBadge = (role: string) => {
    if (role === 'admin') {
      return <Badge className="bg-red-500/10 text-red-400 border-red-500/20">Admin</Badge>;
    }
    if (role === 'moderator') {
      return <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20">Moderator</Badge>;
    }
    return <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">User</Badge>;
  };

  const getStatusBadge = (user: UserData) => {
    if (!user.email_confirmed_at) {
      return <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20">Unconfirmed</Badge>;
    }
    if (user.last_sign_in_at) {
      const lastSignIn = new Date(user.last_sign_in_at);
      const daysSinceLastSignIn = Math.floor((Date.now() - lastSignIn.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceLastSignIn <= 7) {
        return <Badge className="bg-green-500/10 text-green-400 border-green-500/20">Active</Badge>;
      }
    }
    return <Badge className="bg-gray-500/10 text-gray-400 border-gray-500/20">Inactive</Badge>;
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.display_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = !roleFilter || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  const uniqueRoles = [...new Set(users.map(user => user.role))];

  if (loading) {
    return (
      <Card className="glass-effect border-default">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-green"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full space-y-6">
      <Card className="glass-effect border-default">
        <CardHeader>
          <CardTitle className="text-primary flex items-center gap-2">
            <Users className="w-5 h-5" />
            User Management
            <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 ml-2">
              {filteredUsers.length} Users
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary w-4 h-4" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-surface border-default text-primary"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 bg-surface border border-default rounded-md text-primary"
            >
              <option value="">All Roles</option>
              {uniqueRoles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
            <Button
              onClick={loadUsers}
              variant="outline"
              size="sm"
              className="border-default text-secondary hover:bg-surface hover:text-primary"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-primary">User</TableHead>
                    <TableHead className="text-primary">Role</TableHead>
                    <TableHead className="text-primary">Status</TableHead>
                    <TableHead className="text-primary">Created</TableHead>
                    <TableHead className="text-primary">Last Active</TableHead>
                    <TableHead className="text-primary">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-surface rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-secondary" />
                          </div>
                          <div>
                            <div className="font-medium text-primary">{user.display_name}</div>
                            <div className="text-sm text-secondary">{user.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getRoleBadge(user.role || 'user')}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(user)}
                      </TableCell>
                      <TableCell className="text-secondary">
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-secondary">
                        {user.last_sign_in_at 
                          ? new Date(user.last_sign_in_at).toLocaleDateString()
                          : 'Never'
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <select
                            value={user.role || 'user'}
                            onChange={(e) => updateUserRole(user.id, e.target.value)}
                            className="px-2 py-1 text-sm bg-surface border border-default rounded text-primary"
                          >
                            <option value="user">User</option>
                            <option value="moderator">Moderator</option>
                            <option value="admin">Admin</option>
                          </select>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                              >
                                <UserX className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-surface border-default">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-primary">Delete User</AlertDialogTitle>
                                <AlertDialogDescription className="text-secondary">
                                  Are you sure you want to delete {user.email}? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="bg-surface border-default text-secondary hover:bg-background">
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteUser(user.id)}
                                  className="bg-red-500 hover:bg-red-600 text-white"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="w-16 h-16 text-secondary/50 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-primary mb-2">
                No Users Found
              </h3>
              <p className="text-secondary">
                {searchTerm || roleFilter ? 'No users match your search criteria.' : 'No users found.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
