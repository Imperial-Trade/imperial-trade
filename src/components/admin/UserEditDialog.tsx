
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AdminUser } from '@/hooks/useAdminUserManagement';
import { adminUserUpdateSchema, AdminUserUpdate } from '@/lib/validations/adminUserSchema';
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
    user_type: user.user_type,
    access_level: user.access_level,
    account_status: user.account_status,
    phone_number: user.phone_number || '',
    registration_source: user.registration_source,
    approved_at: user.approved_at,
    approved_by: user.approved_by,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        display_name: user.display_name,
        user_type: user.user_type,
        access_level: user.access_level,
        account_status: user.account_status,
        phone_number: user.phone_number || '',
        registration_source: user.registration_source,
        approved_at: user.approved_at,
        approved_by: user.approved_by,
      });
      setErrors({});
    }
  }, [user]);

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
              Display Name
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3 h-3 ml-1 inline" />
                </TooltipTrigger>
                <TooltipContent>The name displayed throughout the application</TooltipContent>
              </Tooltip>
            </Label>
            <Input
              id="display_name"
              value={formData.display_name}
              onChange={(e) => handleInputChange('display_name', e.target.value)}
              className={`bg-background border-default text-primary ${errors.display_name ? 'border-red-500' : ''}`}
              placeholder="Enter display name"
            />
            {errors.display_name && (
              <p className="text-red-400 text-sm mt-1">{errors.display_name}</p>
            )}
          </div>
          
          <div>
            <Label htmlFor="user_type" className="text-primary">
              User Type
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3 h-3 ml-1 inline" />
                </TooltipTrigger>
                <TooltipContent>Defines the user's role in the system</TooltipContent>
              </Tooltip>
            </Label>
            <Select value={formData.user_type} onValueChange={(value: 'member' | 'educator' | 'admin') => handleInputChange('user_type', value)}>
              <SelectTrigger className={`bg-background border-default text-primary ${errors.user_type ? 'border-red-500' : ''}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-surface border-default">
                <SelectItem value="member">Member - Regular user access</SelectItem>
                <SelectItem value="educator">Educator - Can create educational content</SelectItem>
                <SelectItem value="admin">Admin - Full system access</SelectItem>
              </SelectContent>
            </Select>
            {errors.user_type && (
              <p className="text-red-400 text-sm mt-1">{errors.user_type}</p>
            )}
          </div>
          
          <div>
            <Label htmlFor="access_level" className="text-primary">
              Access Level
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3 h-3 ml-1 inline" />
                </TooltipTrigger>
                <TooltipContent>Controls what features the user can access</TooltipContent>
              </Tooltip>
            </Label>
            <Select value={formData.access_level} onValueChange={(value: 'user' | 'moderator' | 'admin') => handleInputChange('access_level', value)}>
              <SelectTrigger className={`bg-background border-default text-primary ${errors.access_level ? 'border-red-500' : ''}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-surface border-default">
                <SelectItem value="user">User - Standard access</SelectItem>
                <SelectItem value="moderator">Moderator - Can moderate content</SelectItem>
                <SelectItem value="admin">Admin - Full administrative access</SelectItem>
              </SelectContent>
            </Select>
            {errors.access_level && (
              <p className="text-red-400 text-sm mt-1">{errors.access_level}</p>
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
