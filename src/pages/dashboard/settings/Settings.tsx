
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { User as UserIcon, Bell, Shield, Palette, Download } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function Settings() {
  const { user, signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState({
    displayName: '',
    email: '',
    notifications: {
      signals: true,
      forum: true,
      education: false,
      marketing: false
    },
    privacy: {
      showProfile: true,
      shareActivity: false
    }
  });

  useEffect(() => {
    if (user) {
      setProfile(prev => ({
        ...prev,
        displayName: user.user_metadata?.full_name || '',
        email: user.email || ''
      }));
    }
  }, [user]);

  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      // Update profile logic here
      console.log('Saving profile:', profile);
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const userAccessLevel = user?.user_metadata?.access_level || 'free';
  const getAccessLevelDisplay = (level: string) => {
    const levels = {
      free: { label: 'Free', color: 'bg-gray-500' },
      user: { label: 'Member', color: 'bg-blue-500' },
      admin: { label: 'Admin', color: 'bg-red-500' }
    };
    return levels[level as keyof typeof levels] || levels.free;
  };

  return (
    <div className="min-h-full bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Manage your account preferences and settings</p>
        </div>

        {/* Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-primary to-amber-300 flex items-center justify-center text-white font-bold text-xl">
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <p className="font-semibold text-foreground">{user?.email}</p>
                <Badge className={`${getAccessLevelDisplay(userAccessLevel).color} text-white`}>
                  {getAccessLevelDisplay(userAccessLevel).label}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={profile.displayName}
                  onChange={(e) => setProfile(prev => ({ ...prev, displayName: e.target.value }))}
                  placeholder="Enter your display name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={profile.email}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>

            <Button onClick={handleSaveProfile} disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>

        {/* Notifications Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Trading Signals</Label>
                <p className="text-sm text-muted-foreground">Get notified about new trading signals</p>
              </div>
              <Switch
                checked={profile.notifications.signals}
                onCheckedChange={(checked) => 
                  setProfile(prev => ({ 
                    ...prev, 
                    notifications: { ...prev.notifications, signals: checked } 
                  }))
                }
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Forum Activity</Label>
                <p className="text-sm text-muted-foreground">Get notified about forum replies and mentions</p>
              </div>
              <Switch
                checked={profile.notifications.forum}
                onCheckedChange={(checked) => 
                  setProfile(prev => ({ 
                    ...prev, 
                    notifications: { ...prev.notifications, forum: checked } 
                  }))
                }
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Educational Content</Label>
                <p className="text-sm text-muted-foreground">Get notified about new courses and materials</p>
              </div>
              <Switch
                checked={profile.notifications.education}
                onCheckedChange={(checked) => 
                  setProfile(prev => ({ 
                    ...prev, 
                    notifications: { ...prev.notifications, education: checked } 
                  }))
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Privacy Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Privacy Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Show Profile to Others</Label>
                <p className="text-sm text-muted-foreground">Allow other members to view your profile</p>
              </div>
              <Switch
                checked={profile.privacy.showProfile}
                onCheckedChange={(checked) => 
                  setProfile(prev => ({ 
                    ...prev, 
                    privacy: { ...prev.privacy, showProfile: checked } 
                  }))
                }
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Share Trading Activity</Label>
                <p className="text-sm text-muted-foreground">Share your trading performance with the community</p>
              </div>
              <Switch
                checked={profile.privacy.shareActivity}
                onCheckedChange={(checked) => 
                  setProfile(prev => ({ 
                    ...prev, 
                    privacy: { ...prev.privacy, shareActivity: checked } 
                  }))
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Account Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Account Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </Button>
              <Button variant="destructive" onClick={handleSignOut}>
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
