
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus } from 'lucide-react';
import { CreateUserData } from '@/hooks/useAdminUserManagement';

interface CreateUserDialogProps {
  onCreateUser: (userData: CreateUserData) => Promise<void>;
}

export function CreateUserDialog({ onCreateUser }: CreateUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<CreateUserData>({
    email: '',
    password: '',
    display_name: '',
    role: 'user',
    access_level: 'user',
    user_type: 'member',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password || !formData.display_name) {
      return;
    }

    try {
      setLoading(true);
      await onCreateUser(formData);
      setOpen(false);
      setFormData({
        email: '',
        password: '',
        display_name: '',
        role: 'user',
        access_level: 'user',
        user_type: 'member',
      });
    } catch (error) {
      console.error('Error creating user:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-accent-green hover:bg-accent-green/80 text-white">
          <UserPlus className="w-4 h-4 mr-2" />
          Create User
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-surface border-default">
        <DialogHeader>
          <DialogTitle className="text-primary">Create New User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email" className="text-primary">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="bg-background border-default text-primary"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="password" className="text-primary">Temporary Password</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="bg-background border-default text-primary"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="display_name" className="text-primary">Display Name</Label>
            <Input
              id="display_name"
              value={formData.display_name}
              onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
              className="bg-background border-default text-primary"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="user_type" className="text-primary">User Type</Label>
            <Select value={formData.user_type} onValueChange={(value: 'member' | 'educator' | 'admin') => setFormData({ ...formData, user_type: value })}>
              <SelectTrigger className="bg-background border-default text-primary">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-surface border-default">
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="educator">Educator</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="access_level" className="text-primary">Access Level</Label>
            <Select value={formData.access_level} onValueChange={(value: 'user' | 'moderator' | 'admin') => setFormData({ ...formData, access_level: value })}>
              <SelectTrigger className="bg-background border-default text-primary">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-surface border-default">
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="moderator">Moderator</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-default text-secondary">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-accent-green hover:bg-accent-green/80 text-white">
              {loading ? 'Creating...' : 'Create User'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
