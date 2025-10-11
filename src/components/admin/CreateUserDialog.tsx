
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { createUserSchema } from '@/lib/validations/adminUserSchema';
import { toast } from 'sonner';
import { UserPlus, Save, X, Info } from 'lucide-react';

interface CreateUserData {
  email: string;
  password: string;
  display_name?: string;
  role: string;
}

interface CreateUserDialogProps {
  onCreateUser: (userData: CreateUserData) => Promise<void>;
}

export function CreateUserDialog({ onCreateUser }: CreateUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateUserData>({
    email: '',
    password: '',
    display_name: '',
    role: 'user'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    try {
      createUserSchema.parse(formData);
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
      await onCreateUser(formData);
      toast.success('User created successfully');
      setOpen(false);
      setFormData({
        email: '',
        password: '',
        display_name: '',
        role: 'user'
      });
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error('Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof CreateUserData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-accent-blue hover:bg-accent-blue/80 text-white">
          <UserPlus className="w-4 h-4 mr-2" />
          Create User
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-surface border-default max-w-md">
        <DialogHeader>
          <DialogTitle className="text-primary">Create New User</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email" className="text-primary">
              Email Address
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3 h-3 ml-1 inline" />
                </TooltipTrigger>
                <TooltipContent>User's email address for login</TooltipContent>
              </Tooltip>
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={`bg-background border-default text-primary ${errors.email ? 'border-red-500' : ''}`}
              placeholder="user@example.com"
            />
            {errors.email && (
              <p className="text-red-400 text-sm mt-1">{errors.email}</p>
            )}
          </div>
          
          <div>
            <Label htmlFor="password" className="text-primary">
              Password
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3 h-3 ml-1 inline" />
                </TooltipTrigger>
                <TooltipContent>Minimum 8 characters required</TooltipContent>
              </Tooltip>
            </Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              className={`bg-background border-default text-primary ${errors.password ? 'border-red-500' : ''}`}
              placeholder="Enter secure password"
            />
            {errors.password && (
              <p className="text-red-400 text-sm mt-1">{errors.password}</p>
            )}
          </div>
          
          <div>
            <Label htmlFor="display_name" className="text-primary">
              Display Name (Optional)
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3 h-3 ml-1 inline" />
                </TooltipTrigger>
                <TooltipContent>Optional - Users can set their own display name after first login</TooltipContent>
              </Tooltip>
            </Label>
            <Input
              id="display_name"
              value={formData.display_name}
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
              Role (Select one)
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3 h-3 ml-1 inline" />
                </TooltipTrigger>
                <TooltipContent>Assign a single role to control user permissions</TooltipContent>
              </Tooltip>
            </Label>
            <RadioGroup 
              value={formData.role} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}
              className="space-y-2 mt-2 border border-default rounded-md p-3 bg-background"
            >
              {[
                { value: 'admin', label: 'Admin', description: 'Full system access' },
                { value: 'educator+', label: 'Educator+', description: 'Signal creation + Content moderation + Admin panel (Requests + Signals)' },
                { value: 'moderator', label: 'Moderator', description: 'Content moderation + Admin panel (Requests only)' },
                { value: 'educator', label: 'Educator', description: 'Signal creation + Content moderation + Admin panel (Signals only)' },
                { value: 'user', label: 'User', description: 'Basic access (default)' }
              ].map(role => (
                <div key={role.value} className="flex items-start gap-2">
                  <RadioGroupItem
                    value={role.value}
                    id={`create-role-${role.value}`}
                    className="mt-1"
                  />
                  <label htmlFor={`create-role-${role.value}`} className="text-sm cursor-pointer flex-1">
                    <div className="font-medium text-primary">{role.label}</div>
                    <div className="text-xs text-secondary">{role.description}</div>
                  </label>
                </div>
              ))}
            </RadioGroup>
            {errors.role && (
              <p className="text-red-400 text-sm mt-1">{errors.role}</p>
            )}
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)} 
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
              {loading ? 'Creating...' : 'Create User'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
