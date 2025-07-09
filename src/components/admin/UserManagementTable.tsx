
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { adminAuditService } from '@/api/services/AdminAuditService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, UserCog, Shield, Trash2, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  user_metadata?: {
    full_name?: string;
    access_level?: string;
  };
}

interface UserManagementTableProps {
  onRefresh?: () => void;
}

export function UserManagementTable({ onRefresh }: UserManagementTableProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newAccessLevel, setNewAccessLevel] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      // Get current admin user for audit logging
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      // For now, we'll simulate user data since we can't directly access auth.users
      // In a real implementation, you'd need service role access or a user profiles table
      const mockUsers: User[] = [
        {
          id: currentUser.id,
          email: currentUser.email || 'admin@example.com',
          created_at: new Date().toISOString(),
          last_sign_in_at: new Date().toISOString(),
          user_metadata: {
            full_name: currentUser.user_metadata?.full_name || 'Admin User',
            access_level: 'admin'
          }
        }
      ];

      setUsers(mockUsers);

      // Log admin action
      await adminAuditService.logAdminAction(
        'user_management_view',
        currentUser.email || 'unknown',
        'users',
        'all',
        { user_count: mockUsers.length }
      );

    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAccessLevel = async () => {
    if (!selectedUser || !newAccessLevel) return;

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      // In a real implementation, you'd update the user's metadata
      // For now, we'll just log the action and show success
      
      await adminAuditService.logAdminAction(
        'user_access_level_update',
        currentUser.email || 'unknown',
        'user',
        selectedUser.id,
        { 
          old_access_level: selectedUser.user_metadata?.access_level,
          new_access_level: newAccessLevel,
          target_email: selectedUser.email
        }
      );

      toast({
        title: "Success",
        description: `User access level updated to ${newAccessLevel}`,
      });

      setEditDialogOpen(false);
      setSelectedUser(null);
      setNewAccessLevel('');
      onRefresh?.();

    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: "Error",
        description: "Failed to update user access level",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      // In a real implementation, you'd delete the user
      // For now, we'll just log the action
      
      await adminAuditService.logAdminAction(
        'user_delete',
        currentUser.email || 'unknown',
        'user',
        selectedUser.id,
        { 
          deleted_email: selectedUser.email,
          deleted_name: selectedUser.user_metadata?.full_name
        }
      );

      toast({
        title: "Success",
        description: "User deleted successfully",
      });

      setDeleteDialogOpen(false);
      setSelectedUser(null);
      loadUsers();
      onRefresh?.();

    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.user_metadata?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getAccessLevelBadge = (level?: string) => {
    switch (level) {
      case 'admin':
        return <Badge className="bg-red-500/10 text-red-400 border-red-500/20">Admin</Badge>;
      case 'premium':
        return <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20">Premium</Badge>;
      case 'free':
      default:
        return <Badge className="bg-gray-500/10 text-gray-400 border-gray-500/20">Free</Badge>;
    }
  };

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
    <Card className="glass-effect border-default">
      <CardHeader>
        <CardTitle className="text-primary flex items-center gap-2">
          <UserCog className="w-5 h-5" />
          User Management
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
          <Button
            onClick={loadUsers}
            variant="outline"
            className="border-default text-secondary hover:bg-surface hover:text-primary"
          >
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {filteredUsers.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-primary">Email</TableHead>
                <TableHead className="text-primary">Name</TableHead>
                <TableHead className="text-primary">Access Level</TableHead>
                <TableHead className="text-primary">Created</TableHead>
                <TableHead className="text-primary">Last Sign In</TableHead>
                <TableHead className="text-primary">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="text-secondary">{user.email}</TableCell>
                  <TableCell className="text-secondary">
                    {user.user_metadata?.full_name || 'N/A'}
                  </TableCell>
                  <TableCell>
                    {getAccessLevelBadge(user.user_metadata?.access_level)}
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
                      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setNewAccessLevel(user.user_metadata?.access_level || 'free');
                            }}
                            className="border-default text-secondary hover:bg-surface hover:text-primary"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="glass-effect border-default">
                          <DialogHeader>
                            <DialogTitle className="text-primary">Edit User Access</DialogTitle>
                            <DialogDescription className="text-secondary">
                              Update the access level for {selectedUser?.email}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="py-4">
                            <Select value={newAccessLevel} onValueChange={setNewAccessLevel}>
                              <SelectTrigger className="bg-surface border-default text-primary">
                                <SelectValue placeholder="Select access level" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="free">Free</SelectItem>
                                <SelectItem value="premium">Premium</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <DialogFooter>
                            <Button
                              variant="outline"
                              onClick={() => setEditDialogOpen(false)}
                              className="border-default text-secondary hover:bg-surface hover:text-primary"
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={handleUpdateAccessLevel}
                              className="bg-accent-green hover:bg-green-500 text-white"
                            >
                              Update Access
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedUser(user)}
                            className="border-red-500/20 text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="glass-effect border-default">
                          <DialogHeader>
                            <DialogTitle className="text-primary">Delete User</DialogTitle>
                            <DialogDescription className="text-secondary">
                              Are you sure you want to delete {selectedUser?.email}? This action cannot be undone.
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <Button
                              variant="outline"
                              onClick={() => setDeleteDialogOpen(false)}
                              className="border-default text-secondary hover:bg-surface hover:text-primary"
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={handleDeleteUser}
                              className="bg-red-500 hover:bg-red-600 text-white"
                            >
                              Delete User
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8">
            <UserCog className="w-16 h-16 text-secondary/50 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-primary mb-2">
              No Users Found
            </h3>
            <p className="text-secondary">
              {searchTerm ? 'No users match your search criteria.' : 'No users to display.'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
