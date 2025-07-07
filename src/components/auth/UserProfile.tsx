import React, { useState, useEffect } from 'react';
import { User } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User as UserIcon, 
  Mail, 
  Shield, 
  Settings, 
  LogOut,
  Crown,
  Edit
} from 'lucide-react';
import { sendWelcomeEmail } from './AuthNotifications';

export default function UserProfile({ user, onUpdate, onLogout }) {
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    full_name: user?.full_name || '',
    trading_experience: user?.trading_experience || '',
    preferred_markets: user?.preferred_markets || [],
    risk_tolerance: user?.risk_tolerance || 'medium'
  });

  const handleSave = async () => {
    try {
      await User.updateMyUserData(profileData);
      onUpdate && onUpdate();
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await User.logout();
      onLogout && onLogout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const getAccessLevelInfo = (level) => {
    switch(level) {
      case 'admin':
        return { label: 'Educator', color: 'bg-accent-gold/20 text-accent-gold', icon: Crown };
      case 'user':
        return { label: 'Full Member', color: 'bg-accent-green/20 text-accent-green', icon: UserIcon };
      case 'free':
        return { label: 'Free Tier', color: 'bg-accent-blue/20 text-accent-blue', icon: UserIcon };
      default:
        return { label: 'Member', color: 'bg-gray-500/20 text-gray-400', icon: UserIcon };
    }
  };

  const accessInfo = getAccessLevelInfo(user?.access_level);
  const AccessIcon = accessInfo.icon;

  return (
    <Card className="glass-effect border-default max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-3">
            <div className="w-12 h-12 bg-accent-green rounded-full flex items-center justify-center">
              <span className="text-white text-lg font-bold">
                {user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
              </span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-primary">{user?.full_name || 'User'}</h3>
              <Badge className={accessInfo.color}>
                <AccessIcon className="w-3 h-3 mr-1" />
                {accessInfo.label}
              </Badge>
            </div>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            className="text-secondary hover:text-primary"
          >
            <Edit className="w-4 h-4 mr-2" />
            {isEditing ? 'Cancel' : 'Edit'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="profile">Profile Info</TabsTrigger>
            <TabsTrigger value="security">Account Security</TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-secondary">Full Name</label>
                <Input
                  value={profileData.full_name}
                  onChange={(e) => setProfileData({...profileData, full_name: e.target.value})}
                  disabled={!isEditing}
                  className="bg-surface border-default text-primary"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-secondary">Email</label>
                <Input
                  value={user?.email || ''}
                  disabled
                  className="bg-surface/50 border-default text-secondary"
                />
              </div>
            </div>
            
            {isEditing && (
              <div className="flex gap-3 justify-end pt-4">
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} className="bg-accent-green hover:bg-green-500 text-white">
                  Save Changes
                </Button>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="security" className="space-y-4">
            <div className="space-y-4">
              <div className="p-4 bg-surface/50 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <Shield className="w-5 h-5 text-accent-green" />
                  <span className="font-medium text-primary">Secure Authentication</span>
                </div>
                <p className="text-sm text-secondary">
                  Your account is secured through social login providers (Google, etc.). 
                  No passwords are stored on our platform.
                </p>
              </div>
              
              <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                <h4 className="font-medium text-primary mb-2 flex items-center gap-2">
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </h4>
                <p className="text-sm text-secondary mb-3">
                  This will sign you out of your Imperial Trading account on this device.
                </p>
                <Button
                  onClick={handleLogout}
                  variant="destructive"
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}