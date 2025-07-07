
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { User, Bell, Shield, Palette } from 'lucide-react';

const Settings = () => {
  return (
    <div className="min-h-screen p-6 bg-background">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-amber-300 bg-clip-text text-transparent">
            Settings
          </h1>
          <p className="text-lg text-muted-foreground">
            Manage your account preferences and notifications.
          </p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" placeholder="Enter your first name" />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" placeholder="Enter your last name" />
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="Enter your email" />
              </div>
              <Button>Save Profile</Button>
            </CardContent>
          </Card>

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
                  <p className="text-sm text-muted-foreground">Receive notifications for new trading signals</p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Live Sessions</Label>
                  <p className="text-sm text-muted-foreground">Get notified when live sessions start</p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Community Updates</Label>
                  <p className="text-sm text-muted-foreground">Receive updates from the trading community</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline">Change Password</Button>
              <Button variant="outline">Enable Two-Factor Authentication</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;
</lov-Write>

<lov-write file_path="src/pages/AdminPanel.tsx">
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Users, TrendingUp, Settings, BarChart } from 'lucide-react';

const AdminPanel = () => {
  return (
    <div className="min-h-screen p-6 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-amber-300 bg-clip-text text-transparent">
            Admin Panel
          </h1>
          <p className="text-lg text-muted-foreground">
            Manage users, signals, and platform settings.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:scale-[1.02] transition-all duration-300 border-primary/20">
            <CardHeader>
              <Users className="h-8 w-8 text-blue-500 mb-2" />
              <CardTitle>User Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Manage user accounts, permissions, and subscriptions.
              </p>
            </CardContent>
          </Card>

          <Card className="hover:scale-[1.02] transition-all duration-300 border-primary/20">
            <CardHeader>
              <TrendingUp className="h-8 w-8 text-green-500 mb-2" />
              <CardTitle>Signal Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Create, edit, and manage trading signals for the community.
              </p>
            </CardContent>
          </Card>

          <Card className="hover:scale-[1.02] transition-all duration-300 border-primary/20">
            <CardHeader>
              <BarChart className="h-8 w-8 text-purple-500 mb-2" />
              <CardTitle>Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                View platform analytics, user engagement, and performance metrics.
              </p>
            </CardContent>
          </Card>

          <Card className="hover:scale-[1.02] transition-all duration-300 border-primary/20">
            <CardHeader>
              <Settings className="h-8 w-8 text-orange-500 mb-2" />
              <CardTitle>Platform Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Configure platform settings, features, and integrations.
              </p>
            </CardContent>
          </Card>

          <Card className="hover:scale-[1.02] transition-all duration-300 border-primary/20">
            <CardHeader>
              <Shield className="h-8 w-8 text-red-500 mb-2" />
              <CardTitle>Security</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Manage security settings, access logs, and system monitoring.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
