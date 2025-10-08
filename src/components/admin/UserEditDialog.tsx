
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AdminUser } from '@/hooks/useAdminUserManagement';
import { adminUserUpdateSchema, AdminUserUpdate } from '@/lib/validations/adminUserSchema';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Save, X, Info } from 'lucide-react';

interface UserEditDialogProps {
  user: AdminUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (userId: string, userData: Partial<AdminUser>) => Promise<void>;
}

export function UserEditDialog({ user, open, onOpenChange, onSave }: UserEditDialogProps) {
  const [formData, setFormData] = useState<AdminUserUpdate>({
    display_name: user.display_name,
    account_status: user.account_status,
    phone_number: user.phone_number || '',
  });
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && open) {
      setFormData({
        display_name: user.display_name,
        account_status: user.account_status,
        phone_number: user.phone_number || '',
      });
      setErrors({});
      
      // Fetch user roles
      const fetchUserRoles = async () => {
        setLoadingRoles(true);
        const { data, error } = await supabase.rpc('get_user_roles_array', {
          _user_id: user.id
        });
        if (error) {
          console.error('Error fetching roles:', error);
          toast.error('Failed to load user roles');
          setSelectedRoles([]);
        } else {
          setSelectedRoles(data || []);
        }
        setLoadingRoles(false);
      };
      fetchUserRoles();
    }
  }, [user, open]);

  const validateForm = () => {
    try {
      adminUserUpdateSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error: any) {
      const fieldErrors: Record<string, string> = {};
      error.errors?.forEach((err: any) => {
        const field = err.path[0];
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the validation errors');
      return;
    }

    try {
      setLoading(true);
      
      // 1. Fetch current roles
      const { data: currentRoles } = await supabase.rpc('get_user_roles_array', {
        _user_id: user.id
      });
      
      // 2. Remove roles that are no longer selected
      for (const role of currentRoles || []) {
        if (!selectedRoles.includes(role)) {
          await supabase.rpc('remove_user_role', {
            _user_id: user.id,
            _role: role as 'admin' | 'educator+' | 'moderator' | 'educator' | 'user'
          });
        }
      }
      
      // 3. Add newly selected roles
      for (const role of selectedRoles) {
        if (!currentRoles?.includes(role)) {
          await supabase.rpc('add_user_role', {
            _user_id: user.id,
            _role: role as 'admin' | 'educator+' | 'moderator' | 'educator' | 'user'
          });
        }
      }
      
      // 4. Update other profile fields
      await onSave(user.id, formData);
      
      toast.success('User updated successfully');
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof AdminUserUpdate, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border-default max-w-md">
        <DialogHeader>
          <DialogTitle className="text-primary flex items-center gap-2">
            Edit User: {user.display_name}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="display_name" className="text-primary">
              Display Name (Optional)
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3 h-3 ml-1 inline" />
                </TooltipTrigger>
                <TooltipContent>Optional - Name displayed throughout the application</TooltipContent>
              </Tooltip>
            </Label>
            <Input
              id="display_name"
              value={formData.display_name || ''}
              onChange={(e) => handleInputChange('display_name', e.target.value)}
              className={`bg-background border-default text-primary ${errors.display_name ? 'border-red-500' : ''}`}
              placeholder="Optional - User can set later"
            />
            {errors.display_name && (
              <p className="text-red-400 text-sm mt-1">{errors.display_name}</p>
            )}
          </div>
          
          <div>
            <Label className="text-primary">
              Roles (Select all that apply)
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3 h-3 ml-1 inline" />
                </TooltipTrigger>
                <TooltipContent>Assign roles to control user permissions and admin panel access</TooltipContent>
              </Tooltip>
            </Label>
            {loadingRoles ? (
              <div className="text-sm text-secondary">Loading roles...</div>
            ) : (
              <div className="space-y-2 mt-2 border border-default rounded-md p-3 bg-background">
                {[
                  { value: 'admin', label: 'Admin', description: 'Full system access' },
                  { value: 'educator+', label: 'VIP Educator', description: 'Signal creation + Content moderation + Admin panel (Requests + Signals)' },
                  { value: 'moderator', label: 'Moderator', description: 'Content moderation + Admin panel (Requests only)' },
                  { value: 'educator', label: 'Educator', description: 'Signal creation + Content moderation + Admin panel (Signals only)' },
                  { value: 'user', label: 'User', description: 'Basic access (default)' }
                ].map(role => (
                  <div key={role.value} className="flex items-start gap-2">
                    <Checkbox
                      id={`role-${role.value}`}
                      checked={selectedRoles.includes(role.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedRoles(prev => [...prev, role.value]);
                        } else {
                          setSelectedRoles(prev => prev.filter(r => r !== role.value));
                        }
                      }}
                      className="mt-1"
                    />
                    <label htmlFor={`role-${role.value}`} className="text-sm cursor-pointer flex-1">
                      <div className="font-medium text-primary">{role.label}</div>
                      <div className="text-xs text-secondary">{role.description}</div>
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div>
            <Label htmlFor="account_status" className="text-primary">
              Account Status
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3 h-3 ml-1 inline" />
                </TooltipTrigger>
                <TooltipContent>Current status of the user account</TooltipContent>
              </Tooltip>
            </Label>
            <Select value={formData.account_status} onValueChange={(value: 'active' | 'suspended' | 'pending_verification' | 'inactive') => handleInputChange('account_status', value)}>
              <SelectTrigger className={`bg-background border-default text-primary ${errors.account_status ? 'border-red-500' : ''}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-surface border-default">
                <SelectItem value="active">Active - Can use all features</SelectItem>
                <SelectItem value="suspended">Suspended - Access temporarily blocked</SelectItem>
                <SelectItem value="pending_verification">Pending - Awaiting verification</SelectItem>
                <SelectItem value="inactive">Inactive - Account disabled</SelectItem>
              </SelectContent>
            </Select>
            {errors.account_status && (
              <p className="text-red-400 text-sm mt-1">{errors.account_status}</p>
            )}
          </div>
          
          <div>
            <Label htmlFor="phone_number" className="text-primary">
              Phone Number (Optional)
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3 h-3 ml-1 inline" />
                </TooltipTrigger>
                <TooltipContent>Contact phone number for the user</TooltipContent>
              </Tooltip>
            </Label>
            <Input
              id="phone_number"
              value={formData.phone_number || ''}
              onChange={(e) => handleInputChange('phone_number', e.target.value)}
              className={`bg-background border-default text-primary ${errors.phone_number ? 'border-red-500' : ''}`}
              placeholder="Enter phone number"
            />
            {errors.phone_number && (
              <p className="text-red-400 text-sm mt-1">{errors.phone_number}</p>
            )}
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)} 
              className="border-default text-secondary hover:bg-surface"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading} 
              className="bg-accent-green hover:bg-accent-green/80 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
