import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  AlertTriangle
} from 'lucide-react';
import { useAdminUserManagement, AdminUser } from '@/hooks/useAdminUserManagement';
import { CreateUserDialog } from './CreateUserDialog';

export function EnhancedUserManagementTable() {
  const { users, loading, loadUsers, updateUser, deleteUser, createUser, resetPassword } = useAdminUserManagement();
  const [searchTerm, setSearchTerm] = useState('');
  const [userTypeFilter, setUserTypeFilter] = useState<string>('all');
  const [accessLevelFilter, setAccessLevelFilter] = useState<string>('all');
  const [accountStatusFilter, setAccountStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const getUserTypeBadge = (userType: string) => {
    switch (userType) {
      case 'admin':
        return <Badge className="bg-red-500/10 text-red-400 border-red-500/20">Admin</Badge>;
      case 'educator':
        return <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20">Educator</Badge>;
      default:
        return <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">Member</Badge>;
    }
  };

  const getAccessLevelBadge = (accessLevel: string) => {
    switch (accessLevel) {
      case 'admin':
        return <Badge className="bg-red-500/10 text-red-400 border-red-500/20">Admin</Badge>;
      case 'moderator':
        return <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20">Moderator</Badge>;
      default:
        return <Badge className="bg-green-500/10 text-green-400 border-green-500/20">User</Badge>;
    }
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
    
    const matchesUserType = userTypeFilter === 'all' || user.user_type === userTypeFilter;
    const matchesAccessLevel = accessLevelFilter === 'all' || user.access_level === accessLevelFilter;
    const matchesAccountStatus = accountStatusFilter === 'all' || user.account_status === accountStatusFilter;
    
    return matchesSearch && matchesUserType && matchesAccessLevel && matchesAccountStatus;
  });

  const handleUpdateRole = async (userId: string, field: string, value: string) => {
    await updateUser(userId, { [field]: value });
  };

  const handleToggleAccountStatus = async (user: AdminUser) => {
    const newStatus = user.account_status === 'active' ? 'suspended' : 'active';
    await updateUser(user.id, { account_status: newStatus });
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
          
          {/* Search and Filters */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary w-4 h-4" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-surface border-default text-primary"
                />
              </div>
              <CreateUserDialog onCreateUser={createUser} />
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
            
            {/* Filter Row */}
            <div className="flex gap-4">
              <Select value={userTypeFilter} onValueChange={setUserTypeFilter}>
                <SelectTrigger className="w-40 bg-surface border-default text-primary">
                  <SelectValue placeholder="User Type" />
                </SelectTrigger>
                <SelectContent className="bg-surface border-default">
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="educator">Educator</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={accessLevelFilter} onValueChange={setAccessLevelFilter}>
                <SelectTrigger className="w-40 bg-surface border-default text-primary">
                  <SelectValue placeholder="Access Level" />
                </SelectTrigger>
                <SelectContent className="bg-surface border-default">
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="moderator">Moderator</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={accountStatusFilter} onValueChange={setAccountStatusFilter}>
                <SelectTrigger className="w-40 bg-surface border-default text-primary">
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-primary">User</TableHead>
                    <TableHead className="text-primary">Type</TableHead>
                    <TableHead className="text-primary">Access Level</TableHead>
                    <TableHead className="text-primary">Status</TableHead>
                    <TableHead className="text-primary">Source</TableHead>
                    <TableHead className="text-primary">Created</TableHead>
                    <TableHead className="text-primary">Last Login</TableHead>
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
                            {user.phone_number && (
                              <div className="text-xs text-secondary flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {user.phone_number}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Select
                          value={user.user_type}
                          onValueChange={(value) => handleUpdateRole(user.id, 'user_type', value)}
                        >
                          <SelectTrigger className="w-32 h-8 text-xs bg-surface border-default">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-surface border-default">
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="educator">Educator</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      
                      <TableCell>
                        <Select
                          value={user.access_level}
                          onValueChange={(value) => handleUpdateRole(user.id, 'access_level', value)}
                        >
                          <SelectTrigger className="w-32 h-8 text-xs bg-surface border-default">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-surface border-default">
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="moderator">Moderator</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      
                      <TableCell>
                        {getAccountStatusBadge(user.account_status)}
                      </TableCell>
                      
                      <TableCell>
                        {getRegistrationSourceBadge(user.registration_source)}
                      </TableCell>
                      
                      <TableCell className="text-secondary">
                        <div className="flex items-center gap-1 text-xs">
                          <Calendar className="w-3 h-3" />
                          {new Date(user.created_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      
                      <TableCell className="text-secondary">
                        {user.last_login ? (
                          <div className="flex items-center gap-1 text-xs">
                            <Clock className="w-3 h-3" />
                            {new Date(user.last_login).toLocaleDateString()}
                          </div>
                        ) : (
                          <span className="text-xs">Never</span>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {/* Suspend/Activate Toggle */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleAccountStatus(user)}
                            className={`h-8 text-xs ${
                              user.account_status === 'suspended'
                                ? 'border-green-500/30 text-green-400 hover:bg-green-500/10'
                                : 'border-orange-500/30 text-orange-400 hover:bg-orange-500/10'
                            }`}
                          >
                            {user.account_status === 'suspended' ? (
                              <>
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Activate
                              </>
                            ) : (
                              <>
                                <Pause className="w-3 h-3 mr-1" />
                                Suspend
                              </>
                            )}
                          </Button>

                          {/* Reset Password */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resetPassword(user.id, user.email)}
                            className="h-8 text-xs border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                          >
                            <Mail className="w-3 h-3 mr-1" />
                            Reset
                          </Button>

                          {/* Delete User */}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
                              >
                                <UserX className="w-3 h-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-surface border-default">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-primary flex items-center gap-2">
                                  <AlertTriangle className="w-5 h-5 text-red-400" />
                                  Delete User
                                </AlertDialogTitle>
                                <AlertDialogDescription className="text-secondary">
                                  Are you sure you want to delete {user.display_name} ({user.email})? 
                                  This action cannot be undone and will permanently remove all user data.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="bg-surface border-default text-secondary hover:bg-background">
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteUser(user.id, user.email)}
                                  className="bg-red-500 hover:bg-red-600 text-white"
                                >
                                  Delete User
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
                {searchTerm || userTypeFilter !== 'all' || accessLevelFilter !== 'all' || accountStatusFilter !== 'all'
                  ? 'No users match your search criteria.'
                  : 'No users found in the system.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
