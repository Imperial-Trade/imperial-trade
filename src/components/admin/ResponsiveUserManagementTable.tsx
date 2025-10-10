
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
  RefreshCw,
  User,
  UserX,
  Mail,
  Shield,
  Clock,
  Phone,
  Calendar,
  CheckCircle,
  XCircle,
  Pause,
  AlertTriangle,
  Edit,
  MoreVertical,
  UserPlus
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAdminUserManagement, AdminUser } from '@/hooks/useAdminUserManagement';
import { CreateUserDialog } from './CreateUserDialog';
import { UserEditDialog } from './UserEditDialog';
import { toast } from 'sonner';

export function ResponsiveUserManagementTable() {
  const { users, loading, loadUsers, updateUser, deleteUser, createUser, resetPassword } = useAdminUserManagement();
  const [searchTerm, setSearchTerm] = useState('');
  const [userTypeFilter, setUserTypeFilter] = useState<string>('all');
  const [accountStatusFilter, setAccountStatusFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const getRolesBadge = (userRoles?: string[]) => {
    if (!userRoles || userRoles.length === 0) {
      return <Badge className="bg-gray-500/10 text-gray-400 border-gray-500/20">No Roles</Badge>;
    }
    
    return (
      <div className="flex flex-wrap gap-1">
        {userRoles.map((role) => {
          const badgeClass = role === 'admin' 
            ? 'bg-red-500/10 text-red-400 border-red-500/20'
            : role === 'educator+' 
            ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
            : role === 'educator'
            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
            : role === 'moderator'
            ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
            : 'bg-green-500/10 text-green-400 border-green-500/20';
            
          return (
            <Badge key={role} className={badgeClass}>
              {role === 'educator+' ? 'Educator+' : role.charAt(0).toUpperCase() + role.slice(1)}
            </Badge>
          );
        })}
      </div>
    );
  };

  const getUserTypeBadge = (userType: string) => {
    // DEPRECATED - Display warning
    return <Badge variant="outline" className="bg-orange-500/10 text-orange-400 border-orange-500/20">⚠️ Deprecated</Badge>;
  };

  const getAccessLevelBadge = (accessLevel: string) => {
    // DEPRECATED - Display warning
    return <Badge variant="outline" className="bg-orange-500/10 text-orange-400 border-orange-500/20">⚠️ Deprecated</Badge>;
  };

  const getAccountStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/10 text-green-400 border-green-500/20"><CheckCircle className="w-3 h-3 mr-1" /> Active</Badge>;
      case 'suspended':
        return <Badge className="bg-red-500/10 text-red-400 border-red-500/20"><XCircle className="w-3 h-3 mr-1" /> Suspended</Badge>;
      case 'pending_verification':
        return <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      default:
        return <Badge className="bg-gray-500/10 text-gray-400 border-gray-500/20"><Pause className="w-3 h-3 mr-1" /> Inactive</Badge>;
    }
  };

  const getRegistrationSourceBadge = (source: string) => {
    switch (source) {
      case 'account_request':
        return <Badge variant="outline" className="text-blue-400 border-blue-500/30">Request</Badge>;
      case 'social':
        return <Badge variant="outline" className="text-purple-400 border-purple-500/30">Social</Badge>;
      case 'admin_created':
        return <Badge variant="outline" className="text-red-400 border-red-500/30">Admin</Badge>;
      case 'invitation':
        return <Badge variant="outline" className="text-yellow-400 border-yellow-500/30">Invite</Badge>;
      default:
        return <Badge variant="outline" className="text-gray-400 border-gray-500/30">Direct</Badge>;
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.phone_number && user.phone_number.includes(searchTerm));
    
    const matchesAccountStatus = accountStatusFilter === 'all' || user.account_status === accountStatusFilter;
    
    // Filter by roles
    const matchesRoleFilter = userTypeFilter === 'all' || user.userRoles?.includes(userTypeFilter);
    
    return matchesSearch && matchesAccountStatus && matchesRoleFilter;
  });

  const handleToggleAccountStatus = async (user: AdminUser) => {
    const newStatus = user.account_status === 'active' ? 'suspended' : 'active';
    try {
      await updateUser(user.id, { account_status: newStatus });
      toast.success(`User ${newStatus === 'active' ? 'activated' : 'suspended'} successfully`);
    } catch (error) {
      toast.error(`Failed to ${newStatus === 'active' ? 'activate' : 'suspend'} user`);
    }
  };

  const handleEditUser = (user: AdminUser) => {
    setSelectedUser(user);
    setIsEditDialogOpen(true);
  };

  const handleDeleteUser = async (user: AdminUser) => {
    try {
      await deleteUser(user.id, user.email);
      toast.success('User deleted successfully');
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  const handleResetPassword = async (user: AdminUser) => {
    try {
      await resetPassword(user.id, user.email);
      toast.success('Password reset email sent');
    } catch (error) {
      toast.error('Failed to send password reset email');
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
    <TooltipProvider>
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
            
            {/* Search and Controls - Mobile optimized */}
            <div className="flex flex-col gap-3 sm:gap-4 px-4 sm:px-6">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1 w-full min-w-0">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary w-4 h-4 pointer-events-none" />
                  <Input
                    placeholder="Search by name, email, or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-surface border-default text-primary w-full h-11"
                    style={{ fontSize: '16px' }}
                  />
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <CreateUserDialog onCreateUser={createUser} />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={loadUsers}
                        variant="outline"
                        size="sm"
                        className="border-default text-secondary hover:bg-surface hover:text-primary h-11 w-11"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Refresh user list</TooltipContent>
                  </Tooltip>
                </div>
              </div>
              
              {/* Filter Row - Full width on mobile */}
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <Select value={userTypeFilter} onValueChange={setUserTypeFilter}>
                  <SelectTrigger className="w-full sm:w-40 bg-surface border-default text-primary h-11">
                    <SelectValue placeholder="Role Filter" />
                  </SelectTrigger>
                  <SelectContent className="bg-surface border-default">
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="educator+">Educator+</SelectItem>
                    <SelectItem value="educator">Educator</SelectItem>
                    <SelectItem value="moderator">Moderator</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={accountStatusFilter} onValueChange={setAccountStatusFilter}>
                  <SelectTrigger className="w-full sm:w-40 bg-surface border-default text-primary h-11">
                    <SelectValue placeholder="Account Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-surface border-default">
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="pending_verification">Pending</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {filteredUsers.length > 0 ? (
              <div className="space-y-0">
                {/* Desktop Table View - Keep hidden on mobile */}
                <div className="hidden lg:block">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px]">
                    <thead>
                      <tr className="border-b border-default">
                        <th className="text-left p-4 text-primary font-medium">User</th>
                        <th className="text-left p-4 text-primary font-medium">Roles</th>
                        <th className="text-left p-4 text-primary font-medium">Status</th>
                        <th className="text-left p-4 text-primary font-medium">Source</th>
                        <th className="text-left p-4 text-primary font-medium">Created</th>
                        <th className="text-left p-4 text-primary font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => (
                        <tr key={user.id} className="border-b border-default/50 hover:bg-surface/50">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-surface rounded-full flex items-center justify-center">
                                <User className="w-4 h-4 text-secondary" />
                              </div>
                              <div>
                                <div className="font-medium text-primary">{user.display_name}</div>
                                <div className="text-sm text-secondary">{user.email}</div>
                                {user.phone_number && (
                                  <div className="text-xs text-secondary flex items-center gap-1">
                                    <Phone className="w-3 h-3" />
                                    {user.phone_number}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-4">{getRolesBadge(user.userRoles)}</td>
                          <td className="p-4">{getAccountStatusBadge(user.account_status)}</td>
                          <td className="p-4">{getRegistrationSourceBadge(user.registration_source)}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-1 text-xs text-secondary">
                              <Calendar className="w-3 h-3" />
                              {new Date(user.created_at).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="p-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-surface border-default">
                                <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit User
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleToggleAccountStatus(user)}>
                                  {user.account_status === 'suspended' ? (
                                    <>
                                      <CheckCircle className="mr-2 h-4 w-4" />
                                      Activate
                                    </>
                                  ) : (
                                    <>
                                      <Pause className="mr-2 h-4 w-4" />
                                      Suspend
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleResetPassword(user)}>
                                  <Mail className="mr-2 h-4 w-4" />
                                  Reset Password
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteUser(user)}
                                  className="text-red-400 focus:text-red-400"
                                >
                                  <UserX className="mr-2 h-4 w-4" />
                                  Delete User
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View - MOBILE OPTIMIZED */}
                <div className="lg:hidden space-y-3 p-4">
                  {filteredUsers.map((user) => (
                    <Card key={user.id} className="bg-surface border-default overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 bg-background rounded-full flex items-center justify-center flex-shrink-0">
                              <User className="w-5 h-5 text-secondary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-primary break-words">{user.display_name}</div>
                              <div className="text-sm text-secondary break-all">{user.email}</div>
                              {user.phone_number && (
                                <div className="text-xs text-secondary flex items-center gap-1 mt-1 break-all">
                                  <Phone className="w-3 h-3 flex-shrink-0" />
                                  <span className="break-all">{user.phone_number}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-10 w-10 p-0 flex-shrink-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-surface border-default">
                              <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit User
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleAccountStatus(user)}>
                                {user.account_status === 'suspended' ? (
                                  <>
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Activate
                                  </>
                                ) : (
                                  <>
                                    <Pause className="mr-2 h-4 w-4" />
                                    Suspend
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleResetPassword(user)}>
                                <Mail className="mr-2 h-4 w-4" />
                                Reset Password
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeleteUser(user)}
                                className="text-red-400 focus:text-red-400"
                              >
                                <UserX className="mr-2 h-4 w-4" />
                                Delete User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        
                        <div className="mt-3 space-y-2">
                          <div className="flex flex-wrap gap-2">
                            {getRolesBadge(user.userRoles || [])}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {getAccountStatusBadge(user.account_status)}
                            {getRegistrationSourceBadge(user.registration_source)}
                          </div>
                        </div>
                        
                        <div className="mt-3 text-xs text-secondary flex flex-wrap items-center gap-1">
                          <Calendar className="w-3 h-3 flex-shrink-0" />
                          <span className="break-words">Created: {new Date(user.created_at).toLocaleDateString()}</span>
                          {user.last_login && (
                            <>
                              <span className="mx-2">•</span>
                              <Clock className="w-3 h-3 flex-shrink-0" />
                              <span className="break-words">Last login: {new Date(user.last_login).toLocaleDateString()}</span>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                  </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-16 h-16 text-secondary/50 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-primary mb-2">
                  No Users Found
                </h3>
                <p className="text-secondary">
                  {searchTerm || userTypeFilter !== 'all' || accountStatusFilter !== 'all'
                    ? 'No users match your search criteria.'
                    : 'No users found in the system.'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit User Dialog */}
        {selectedUser && (
          <UserEditDialog
            user={selectedUser}
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            onSave={updateUser}
          />
        )}
      </div>
    </TooltipProvider>
  );
}
