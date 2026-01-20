
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createUserSchema } from '@/lib/validations/adminUserSchema';
import { toast } from 'sonner';
import { UserPlus, Mail, Lock, User, Shield, GraduationCap, Users, Check, Eye, EyeOff, Sparkles } from 'lucide-react';

interface CreateUserData {
  email: string;
  password: string;
  display_name?: string;
  role: string;
}

interface CreateUserDialogProps {
  onCreateUser: (userData: CreateUserData) => Promise<void>;
  children?: React.ReactNode;
}

const ROLES = [
  { 
    value: 'admin', 
    label: 'Admin', 
    description: 'Full system access',
    icon: Shield,
    color: 'from-red-500 to-orange-500',
    borderColor: 'border-red-500/30',
    bgColor: 'bg-red-500/10'
  },
  { 
    value: 'educator+', 
    label: 'Educator+', 
    description: 'Signals + Moderation + Admin',
    icon: Sparkles,
    color: 'from-purple-500 to-pink-500',
    borderColor: 'border-purple-500/30',
    bgColor: 'bg-purple-500/10'
  },
  { 
    value: 'educator', 
    label: 'Educator', 
    description: 'Signal creation + Signals panel',
    icon: GraduationCap,
    color: 'from-blue-500 to-cyan-500',
    borderColor: 'border-blue-500/30',
    bgColor: 'bg-blue-500/10'
  },
  { 
    value: 'moderator', 
    label: 'Moderator', 
    description: 'Content moderation + Requests',
    icon: Users,
    color: 'from-amber-500 to-yellow-500',
    borderColor: 'border-amber-500/30',
    bgColor: 'bg-amber-500/10'
  },
  { 
    value: 'user', 
    label: 'User', 
    description: 'Basic access (default)',
    icon: User,
    color: 'from-slate-400 to-slate-500',
    borderColor: 'border-slate-500/30',
    bgColor: 'bg-slate-500/10'
  }
];

export function CreateUserDialog({ onCreateUser, children }: CreateUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const selectedRole = ROLES.find(r => r.value === formData.role);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ? (
          children
        ) : (
          <Button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg shadow-blue-500/25">
            <UserPlus className="w-4 h-4 mr-2" />
            Create User
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-black/90 backdrop-blur-2xl border-white/10 max-w-md p-0 gap-0 overflow-hidden">
        {/* Header with gradient */}
        <div className="relative px-6 pt-6 pb-4">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10" />
          <div className="relative flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <UserPlus className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Create New User</h2>
              <p className="text-sm text-white/50">Add a new member to the platform</p>
            </div>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-5">
          {/* Email Field */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-white/60 uppercase tracking-wider flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              Email Address
            </label>
            <div className="relative">
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`bg-white/5 border-white/10 text-white placeholder:text-white/30 h-12 rounded-xl pl-4 pr-4 focus:border-blue-500/50 focus:ring-blue-500/20 transition-all ${errors.email ? 'border-red-500/50 focus:border-red-500/50' : ''}`}
                placeholder="user@example.com"
                style={{ fontSize: '16px' }}
              />
            </div>
            {errors.email && (
              <p className="text-red-400 text-xs flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-red-400" />
                {errors.email}
              </p>
            )}
          </div>
          
          {/* Password Field */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-white/60 uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              Password
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className={`bg-white/5 border-white/10 text-white placeholder:text-white/30 h-12 rounded-xl pl-4 pr-12 focus:border-blue-500/50 focus:ring-blue-500/20 transition-all ${errors.password ? 'border-red-500/50 focus:border-red-500/50' : ''}`}
                placeholder="Minimum 8 characters"
                style={{ fontSize: '16px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors p-1"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-400 text-xs flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-red-400" />
                {errors.password}
              </p>
            )}
          </div>
          
          {/* Display Name Field */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-white/60 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              Display Name
              <span className="text-white/30 normal-case">(optional)</span>
            </label>
            <Input
              id="display_name"
              value={formData.display_name}
              onChange={(e) => handleInputChange('display_name', e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-12 rounded-xl pl-4 pr-4 focus:border-blue-500/50 focus:ring-blue-500/20 transition-all"
              placeholder="User can set this later"
              style={{ fontSize: '16px' }}
            />
          </div>
          
          {/* Role Selection */}
          <div className="space-y-3">
            <label className="text-xs font-medium text-white/60 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              Select Role
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map(role => {
                const Icon = role.icon;
                const isSelected = formData.role === role.value;
                return (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, role: role.value }))}
                    className={`relative p-3 rounded-xl text-left transition-all duration-200 ${
                      isSelected 
                        ? `${role.bgColor} ${role.borderColor} border-2` 
                        : 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20'
                    } ${role.value === 'admin' ? 'col-span-2' : ''}`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${role.color} flex items-center justify-center flex-shrink-0 ${isSelected ? 'shadow-lg' : 'opacity-70'}`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium text-sm ${isSelected ? 'text-white' : 'text-white/70'}`}>
                            {role.label}
                          </span>
                          {isSelected && (
                            <div className={`w-4 h-4 rounded-full bg-gradient-to-br ${role.color} flex items-center justify-center`}>
                              <Check className="w-2.5 h-2.5 text-white" />
                            </div>
                          )}
                        </div>
                        <p className={`text-[10px] mt-0.5 leading-tight ${isSelected ? 'text-white/60' : 'text-white/40'}`}>
                          {role.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            {errors.role && (
              <p className="text-red-400 text-xs flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-red-400" />
                {errors.role}
              </p>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-3 pt-3">
            <Button 
              type="button" 
              variant="ghost"
              onClick={() => setOpen(false)} 
              className="flex-1 h-12 rounded-xl text-white/60 hover:text-white hover:bg-white/10 border border-white/10"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading} 
              className={`flex-1 h-12 rounded-xl text-white font-medium shadow-lg transition-all ${
                selectedRole 
                  ? `bg-gradient-to-r ${selectedRole.color} hover:opacity-90 shadow-${selectedRole.color.split('-')[1]}/30`
                  : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-blue-500/30'
              }`}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  Create User
                </div>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
