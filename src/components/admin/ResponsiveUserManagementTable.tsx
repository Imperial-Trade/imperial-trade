
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
  DialogDescription,
} from '@/components/ui/dialog';
import { 
  Users, 
  Search, 
  RefreshCw,
  User,
  Clock,
  Phone,
  Calendar,
  CheckCircle,
  XCircle,
  Pause,
  Edit,
  MoreVertical,
  UserPlus,
  X,
  SlidersHorizontal,
  Loader2,
  Trash2,
  Key,
  MoreHorizontal
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useAdminUserManagement, AdminUser } from '@/hooks/useAdminUserManagement';
import { CreateUserDialog } from './CreateUserDialog';
import { UserEditDialog } from './UserEditDialog';
import { toast } from 'sonner';

export function ResponsiveUserManagementTable() {
  const { users, loading: dataLoading, loadUsers, updateUser, deleteUser, createUser, resetPassword } = useAdminUserManagement();
  const [searchTerm, setSearchTerm] = useState('');
  const [userTypeFilter, setUserTypeFilter] = useState<string>('all');
  const [accountStatusFilter, setAccountStatusFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // Delete confirmation state
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Mobile filter panel state
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  
  // Loading phase state
  const [loadingPhase, setLoadingPhase] = useState<'loading' | 'transitioning' | 'complete'>('loading');
  
  // Pull-to-refresh state
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pullStartY = useRef<number | null>(null);
  const pullDistanceRef = useRef(0);
  const isRefreshingRef = useRef(false);
  const PULL_THRESHOLD = 80;
  
  // Loading phase: 1s loading, then 0.5s transition
  useEffect(() => {
    const loadingTimer = setTimeout(() => {
      setLoadingPhase('transitioning');
    }, 1000);
    
    const transitionTimer = setTimeout(() => {
      setLoadingPhase('complete');
    }, 1500);
    
    return () => {
      clearTimeout(loadingTimer);
      clearTimeout(transitionTimer);
    };
  }, []);

  const loading = dataLoading || loadingPhase === 'loading';
  const isTransitioning = loadingPhase === 'transitioning';
  
  // Keep refs in sync with state
  useEffect(() => {
    pullDistanceRef.current = pullDistance;
  }, [pullDistance]);
  
  useEffect(() => {
    isRefreshingRef.current = isRefreshing;
  }, [isRefreshing]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);
  
  // Pull-to-refresh - using native event listeners
  useEffect(() => {
    const isAtTop = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      return scrollTop <= 5;
    };
    
    const handleTouchStart = (e: TouchEvent) => {
      if (isAtTop() && !isRefreshingRef.current && window.innerWidth < 1024) {
        pullStartY.current = e.touches[0].clientY;
      }
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      if (pullStartY.current === null || isRefreshingRef.current) return;
      
      const currentY = e.touches[0].clientY;
      const diff = currentY - pullStartY.current;
      
      if (diff > 0 && isAtTop()) {
        e.preventDefault();
        const resistance = 0.5;
        const newPullDistance = Math.min(diff * resistance, 120);
        setPullDistance(newPullDistance);
      } else if (diff < -10) {
        pullStartY.current = null;
        setPullDistance(0);
      }
    };
    
    const handleTouchEnd = async () => {
      if (pullStartY.current === null) return;
      
      const currentPullDistance = pullDistanceRef.current;
      pullStartY.current = null;
      
      if (currentPullDistance >= PULL_THRESHOLD && !isRefreshingRef.current) {
        setIsRefreshing(true);
        setPullDistance(60);
        
        try {
          await loadUsers();
          toast.success('Users refreshed', {
            position: window.innerWidth >= 1024 ? 'bottom-right' : 'bottom-center',
            duration: 2000,
          });
        } catch (error) {
          toast.error('Failed to refresh', {
            position: window.innerWidth >= 1024 ? 'bottom-right' : 'bottom-center',
          });
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
        }
      } else {
        setPullDistance(0);
      }
    };
    
    const handleMouseDown = (e: MouseEvent) => {
      if (isAtTop() && !isRefreshingRef.current && window.innerWidth < 1024) {
        pullStartY.current = e.clientY;
      }
    };
    
    const handleMouseMove = (e: MouseEvent) => {
      if (pullStartY.current === null || isRefreshingRef.current) return;
      
      const diff = e.clientY - pullStartY.current;
      
      if (diff > 0 && isAtTop()) {
        const resistance = 0.5;
        const newPullDistance = Math.min(diff * resistance, 120);
        setPullDistance(newPullDistance);
      } else if (diff < -10) {
        pullStartY.current = null;
        setPullDistance(0);
      }
    };
    
    const handleMouseUp = async () => {
      if (pullStartY.current === null) return;
      
      const currentPullDistance = pullDistanceRef.current;
      pullStartY.current = null;
      
      if (currentPullDistance >= PULL_THRESHOLD && !isRefreshingRef.current) {
        setIsRefreshing(true);
        setPullDistance(60);
        
        try {
          await loadUsers();
          toast.success('Users refreshed', {
            position: window.innerWidth >= 1024 ? 'bottom-right' : 'bottom-center',
            duration: 2000,
          });
        } catch (error) {
          toast.error('Failed to refresh', {
            position: window.innerWidth >= 1024 ? 'bottom-right' : 'bottom-center',
          });
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
        }
      } else {
        setPullDistance(0);
      }
    };
    
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [loadUsers]);
  
  // Check if any filters are active
  const hasActiveFilters = searchTerm !== '' || userTypeFilter !== 'all' || accountStatusFilter !== 'all';
  const activeFilterCount = [searchTerm !== '', userTypeFilter !== 'all', accountStatusFilter !== 'all'].filter(Boolean).length;

  const getRoleBadge = (role: string) => {
    const roleConfig: Record<string, { bg: string; text: string; border: string }> = {
      admin: { bg: 'bg-red-50 dark:bg-red-500/10', text: 'text-red-600 dark:text-red-400', border: 'border-red-200 dark:border-red-500/20' },
      'educator+': { bg: 'bg-purple-50 dark:bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-500/20' },
      educator: { bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-500/20' },
      moderator: { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-500/20' },
      user: { bg: 'bg-slate-50 dark:bg-slate-500/10', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-200 dark:border-slate-500/20' },
    };
    const config = roleConfig[role] || roleConfig.user;
    return (
      <Badge className={`${config.bg} ${config.text} ${config.border} border font-medium text-xs`}>
        {role === 'educator+' ? 'Educator+' : role.charAt(0).toUpperCase() + role.slice(1)}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { icon: React.ReactNode; bg: string; text: string; label: string }> = {
      active: { icon: <CheckCircle className="w-3 h-3" />, bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', label: 'Active' },
      suspended: { icon: <XCircle className="w-3 h-3" />, bg: 'bg-red-50 dark:bg-red-500/10', text: 'text-red-600 dark:text-red-400', label: 'Suspended' },
      pending_verification: { icon: <Clock className="w-3 h-3" />, bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', label: 'Pending' },
      inactive: { icon: <Pause className="w-3 h-3" />, bg: 'bg-slate-50 dark:bg-slate-500/10', text: 'text-slate-600 dark:text-slate-400', label: 'Inactive' },
    };
    const config = statusConfig[status] || statusConfig.inactive;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.icon}
        {config.label}
      </span>
    );
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.real_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.phone_number && user.phone_number.includes(searchTerm));
    
    const matchesAccountStatus = accountStatusFilter === 'all' || user.account_status === accountStatusFilter;
    const matchesRoleFilter = userTypeFilter === 'all' || user.userRoles?.includes(userTypeFilter);
    
    return matchesSearch && matchesAccountStatus && matchesRoleFilter;
  });

  const getToastPosition = () => window.innerWidth >= 1024 ? 'bottom-right' as const : 'bottom-center' as const;

  const handleToggleAccountStatus = async (user: AdminUser) => {
    const newStatus = user.account_status === 'active' ? 'suspended' : 'active';
    try {
      await updateUser(user.id, { account_status: newStatus });
      toast.success(`User ${newStatus === 'active' ? 'activated' : 'suspended'} successfully`, { position: getToastPosition() });
    } catch (error) {
      toast.error(`Failed to ${newStatus === 'active' ? 'activate' : 'suspend'} user`, { position: getToastPosition() });
    }
  };

  const handleEditUser = (user: AdminUser) => {
    setSelectedUser(user);
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (user: AdminUser) => {
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteUser(userToDelete.id, userToDelete.email);
      toast.success('User deleted successfully', { position: getToastPosition() });
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
    } catch (error) {
      toast.error('Failed to delete user', { position: getToastPosition() });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleResetPassword = async (user: AdminUser) => {
    try {
      await resetPassword(user.id, user.email);
      toast.success('Password reset email sent', { position: getToastPosition() });
    } catch (error) {
      toast.error('Failed to send password reset email', { position: getToastPosition() });
    }
  };

  if (loading) {
    return (
      <div className="w-full min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Users className="w-8 h-8 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center shadow-md">
              <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-base font-medium text-slate-900 dark:text-white">Loading Users</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Please wait...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div 
        className={`w-full pb-24 lg:pb-6 transition-all duration-500 ${
          isTransitioning ? 'blur-sm opacity-90' : 'blur-0 opacity-100'
        }`}
      >
        {/* Pull-to-Refresh Indicator - Inline above content */}
        <div 
          className="lg:hidden overflow-hidden flex items-center justify-center"
          style={{ 
            height: pullDistance > 0 || isRefreshing ? Math.max(pullDistance, isRefreshing ? 80 : 0) : 0,
            opacity: isRefreshing ? 1 : Math.min(pullDistance / PULL_THRESHOLD, 1),
            transition: 'height 200ms ease-out, opacity 200ms ease-out',
          }}
        >
          <div className="flex flex-col items-center gap-2 py-4">
            {isRefreshing ? (
              <>
                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-spin" />
                </div>
                <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Refreshing...</span>
              </>
            ) : (
              <>
                <div 
                  className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center transition-all duration-200"
                  style={{ 
                    transform: `rotate(${(pullDistance / PULL_THRESHOLD) * 360}deg)`,
                    backgroundColor: pullDistance >= PULL_THRESHOLD ? 'rgb(238 242 255)' : undefined,
                  }}
                >
                  <RefreshCw className={`w-5 h-5 transition-colors ${pullDistance >= PULL_THRESHOLD ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                </div>
                <span className={`text-sm font-medium transition-colors ${pullDistance >= PULL_THRESHOLD ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
                  {pullDistance >= PULL_THRESHOLD ? 'Release to refresh' : 'Pull to refresh'}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Main Content with Pull Effect */}
        <div 
          style={{ 
            transform: `translateY(${pullDistance}px)`,
            transition: 'transform 200ms ease-out',
          }}
        >
          {/* Header Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4 lg:mb-6">
              <div className="flex items-center gap-3 lg:gap-4">
                <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                  <Users className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg lg:text-2xl font-bold text-slate-900 dark:text-white">User Management</h1>
                  <p className="text-xs lg:text-sm text-slate-500 dark:text-slate-400">
                    {filteredUsers.length} of {users.length} users
                    {hasActiveFilters && (
                      <span className="ml-2 inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              
              {/* Mobile Actions - Right side */}
              <div className="flex lg:hidden items-center gap-2">
                <button
                  onClick={() => setIsFilterPanelOpen(true)}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border ${
                    hasActiveFilters 
                      ? 'bg-indigo-50 dark:bg-indigo-500/20 border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400' 
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <div className="relative">
                    <SlidersHorizontal className="w-4 h-4" />
                    {hasActiveFilters && (
                      <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-indigo-600 rounded-full flex items-center justify-center">
                        <span className="text-[8px] font-bold text-white">{activeFilterCount}</span>
                      </div>
                    )}
                  </div>
                </button>
                <CreateUserDialog onCreateUser={createUser}>
                  <button className="w-9 h-9 rounded-xl flex items-center justify-center bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">
                    <UserPlus className="w-4 h-4" />
                  </button>
                </CreateUserDialog>
              </div>
              
              {/* Desktop Actions */}
              <div className="hidden lg:flex items-center gap-3">
                <Button
                  onClick={loadUsers}
                  variant="outline"
                  size="sm"
                  className="h-10 px-4 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
                <CreateUserDialog onCreateUser={createUser} />
              </div>
            </div>
            
            {/* Desktop Search and Filters */}
            <div className="hidden lg:flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                />
              </div>
              
              <Select value={userTypeFilter} onValueChange={setUserTypeFilter}>
                <SelectTrigger className="w-[160px] h-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="educator+">Educator+</SelectItem>
                  <SelectItem value="educator">Educator</SelectItem>
                  <SelectItem value="moderator">Moderator</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={accountStatusFilter} onValueChange={setAccountStatusFilter}>
                <SelectTrigger className="w-[160px] h-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="pending_verification">Pending</SelectItem>
                </SelectContent>
              </Select>
              
              {hasActiveFilters && (
                <Button
                  onClick={() => {
                    setSearchTerm('');
                    setUserTypeFilter('all');
                    setAccountStatusFilter('all');
                  }}
                  variant="ghost"
                  size="sm"
                  className="h-10 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>
          
          {/* Desktop Table */}
          <div className="hidden lg:block bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  <th className="text-left p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">User</th>
                  <th className="text-left p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Roles</th>
                  <th className="text-left p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="text-left p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Joined</th>
                  <th className="text-right p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-500/20 dark:to-purple-500/20 flex items-center justify-center">
                          <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                          <div className="font-medium text-slate-900 dark:text-white">
                            {user.display_name || user.real_name || 'No Name'}
                          </div>
                          <div className="text-sm text-slate-500 dark:text-slate-400">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {user.userRoles?.map(role => (
                          <span key={role}>{getRoleBadge(role)}</span>
                        )) || <span className="text-slate-400 text-sm">No roles</span>}
                      </div>
                    </td>
                    <td className="p-4">{getStatusBadge(user.account_status)}</td>
                    <td className="p-4">
                      <div className="text-sm text-slate-600 dark:text-slate-300">
                        {new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => handleEditUser(user)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit User
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleResetPassword(user)}>
                            <Key className="w-4 h-4 mr-2" />
                            Reset Password
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleToggleAccountStatus(user)}>
                            {user.account_status === 'suspended' ? (
                              <><CheckCircle className="w-4 h-4 mr-2" />Activate</>
                            ) : (
                              <><Pause className="w-4 h-4 mr-2" />Suspend</>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeleteClick(user)} className="text-red-600 dark:text-red-400">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredUsers.length === 0 && (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No users found</h3>
                <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  {hasActiveFilters ? 'Try adjusting your search or filters.' : 'Create your first user to get started.'}
                </p>
              </div>
            )}
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-3">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <Card key={user.id} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                  <CardContent className="p-4">
                    {/* User Header */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-500/20 dark:to-purple-500/20 flex items-center justify-center">
                          <User className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 dark:text-white truncate">
                            {user.display_name || user.real_name || 'No Name'}
                          </div>
                          <div className="text-sm text-slate-500 dark:text-slate-400 truncate">{user.email}</div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => handleEditUser(user)}>
                            <Edit className="w-4 h-4 mr-2" />Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleResetPassword(user)}>
                            <Key className="w-4 h-4 mr-2" />Reset Password
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleToggleAccountStatus(user)}>
                            {user.account_status === 'suspended' ? (
                              <><CheckCircle className="w-4 h-4 mr-2" />Activate</>
                            ) : (
                              <><Pause className="w-4 h-4 mr-2" />Suspend</>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeleteClick(user)} className="text-red-600 dark:text-red-400">
                            <Trash2 className="w-4 h-4 mr-2" />Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    {/* User Details */}
                    <div className="space-y-3">
                      {user.phone_number && (
                        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                          <Phone className="w-3.5 h-3.5" />
                          <span>{user.phone_number}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 flex-wrap">
                        {user.userRoles?.map(role => (
                          <span key={role}>{getRoleBadge(role)}</span>
                        ))}
                      </div>
                      
                      <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                        {getStatusBadge(user.account_status)}
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-16 px-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No users found</h3>
                <p className="text-slate-500 dark:text-slate-400">
                  {hasActiveFilters ? 'Try adjusting your filters.' : 'Create your first user.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Edit User Dialog */}
        {selectedUser && (
          <UserEditDialog
            user={selectedUser}
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            onSave={async (updates) => {
              await updateUser(selectedUser.id, updates);
              setIsEditDialogOpen(false);
              toast.success('User updated successfully', { position: getToastPosition() });
            }}
          />
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <DialogHeader>
              <DialogTitle className="text-slate-900 dark:text-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                Delete User
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 pt-2">
                Are you sure you want to delete <strong className="text-slate-900 dark:text-white">{userToDelete?.display_name || userToDelete?.email}</strong>? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
                className="flex-1 border-slate-200 dark:border-slate-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {isDeleting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Deleting...</>
                ) : (
                  <>Delete User</>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Mobile Filter Sheet */}
        <Dialog open={isFilterPanelOpen} onOpenChange={setIsFilterPanelOpen}>
          <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-0 gap-0 rounded-t-3xl rounded-b-none fixed bottom-0 top-auto translate-y-0">
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-slate-200 dark:bg-slate-700" />
            </div>
            
            <DialogHeader className="px-6 pb-4">
              <DialogTitle className="text-slate-900 dark:text-white text-lg font-semibold flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Filters
              </DialogTitle>
            </DialogHeader>
            
            <div className="px-6 pb-8 space-y-5">
              {/* Search */}
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">Search</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-11 h-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    style={{ fontSize: '16px' }}
                  />
                </div>
              </div>
              
              {/* Role Filter */}
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">Role</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'all', label: 'All' },
                    { value: 'admin', label: 'Admin' },
                    { value: 'educator+', label: 'Edu+' },
                    { value: 'educator', label: 'Educator' },
                    { value: 'moderator', label: 'Mod' },
                    { value: 'user', label: 'User' },
                  ].map((role) => (
                    <button
                      key={role.value}
                      onClick={() => setUserTypeFilter(role.value)}
                      className={`py-3 px-3 rounded-xl text-sm font-medium transition-all border ${
                        userTypeFilter === role.value
                          ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {role.label}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Status Filter */}
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">Status</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'all', label: 'All Status' },
                    { value: 'active', label: 'Active' },
                    { value: 'suspended', label: 'Suspended' },
                    { value: 'pending_verification', label: 'Pending' },
                  ].map((status) => (
                    <button
                      key={status.value}
                      onClick={() => setAccountStatusFilter(status.value)}
                      className={`py-3 px-3 rounded-xl text-sm font-medium transition-all border ${
                        accountStatusFilter === status.value
                          ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {status.label}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex gap-3 pt-2">
                {hasActiveFilters && (
                  <Button
                    onClick={() => {
                      setSearchTerm('');
                      setUserTypeFilter('all');
                      setAccountStatusFilter('all');
                    }}
                    variant="outline"
                    className="flex-1 h-12 border-slate-200 dark:border-slate-700"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Clear
                  </Button>
                )}
                <Button
                  onClick={() => setIsFilterPanelOpen(false)}
                  className="flex-1 h-12 bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Apply Filters
                  {hasActiveFilters && (
                    <Badge className="ml-2 bg-white/20 text-white text-[10px]">{activeFilterCount}</Badge>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </TooltipProvider>
  );
}
