import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { 
  Smartphone, 
  Monitor, 
  Tablet,
  RefreshCw,
  Search,
  Trash2,
  Bell,
  BellOff,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Users,
  Eye
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface DeviceSubscription {
  id: string;
  user_id: string;
  device_fingerprint: string;
  device_name: string | null;
  platform: string | null;
  browser_name: string | null;
  is_mobile: boolean | null;
  onesignal_player_id: string | null;
  is_active: boolean | null;
  last_seen_at: string | null;
  created_at: string | null;
  welcome_sent: boolean | null;
}

interface UserDeviceInfo {
  user_id: string;
  display_name: string | null;
  email: string | null;
  devices: DeviceSubscription[];
  active_count: number;
  total_count: number;
}

interface DeviceStats {
  total_users_with_devices: number;
  users_with_2_devices: number;
  users_with_1_device: number;
  total_active_devices: number;
  total_inactive_devices: number;
  ios_devices: number;
  android_devices: number;
  desktop_devices: number;
}

export function UserDeviceManagement() {
  const [users, setUsers] = useState<UserDeviceInfo[]>([]);
  const [stats, setStats] = useState<DeviceStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserDeviceInfo | null>(null);

  useEffect(() => {
    loadDeviceData();
  }, []);

  const loadDeviceData = async () => {
    setIsLoading(true);
    try {
      // Fetch all device subscriptions with user info
      const { data: devices, error: devicesError } = await supabase
        .from('device_subscriptions')
        .select(`
          *,
          profiles:user_id (
            display_name,
            email
          )
        `)
        .order('last_seen_at', { ascending: false });

      if (devicesError) throw devicesError;

      // Group devices by user
      const userMap = new Map<string, UserDeviceInfo>();
      
      (devices || []).forEach((device: any) => {
        const userId = device.user_id;
        const profile = device.profiles;
        
        if (!userMap.has(userId)) {
          userMap.set(userId, {
            user_id: userId,
            display_name: profile?.display_name || null,
            email: profile?.email || null,
            devices: [],
            active_count: 0,
            total_count: 0,
          });
        }
        
        const userInfo = userMap.get(userId)!;
        userInfo.devices.push({
          id: device.id,
          user_id: device.user_id,
          device_fingerprint: device.device_fingerprint,
          device_name: device.device_name,
          platform: device.platform,
          browser_name: device.browser_name,
          is_mobile: device.is_mobile,
          onesignal_player_id: device.onesignal_player_id,
          is_active: device.is_active,
          last_seen_at: device.last_seen_at,
          created_at: device.created_at,
          welcome_sent: device.welcome_sent,
        });
        userInfo.total_count++;
        if (device.is_active) {
          userInfo.active_count++;
        }
      });

      const usersList = Array.from(userMap.values()).sort((a, b) => 
        b.active_count - a.active_count
      );

      setUsers(usersList);

      // Calculate stats
      const statsData: DeviceStats = {
        total_users_with_devices: usersList.length,
        users_with_2_devices: usersList.filter(u => u.active_count >= 2).length,
        users_with_1_device: usersList.filter(u => u.active_count === 1).length,
        total_active_devices: (devices || []).filter((d: any) => d.is_active).length,
        total_inactive_devices: (devices || []).filter((d: any) => !d.is_active).length,
        ios_devices: (devices || []).filter((d: any) => 
          d.is_active && (d.device_name?.includes('iPhone') || d.device_name?.includes('iPad'))
        ).length,
        android_devices: (devices || []).filter((d: any) => 
          d.is_active && d.device_name?.includes('Android')
        ).length,
        desktop_devices: (devices || []).filter((d: any) => 
          d.is_active && !d.is_mobile
        ).length,
      };

      setStats(statsData);

    } catch (error) {
      console.error('Failed to load device data:', error);
      toast({
        title: "Error",
        description: "Failed to load device data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deactivateDevice = async (userId: string, deviceId: string) => {
    try {
      const { error } = await supabase
        .from('device_subscriptions')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', deviceId)
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Device Deactivated",
        description: "The device has been deactivated successfully.",
      });

      loadDeviceData();
    } catch (error) {
      console.error('Failed to deactivate device:', error);
      toast({
        title: "Error",
        description: "Failed to deactivate device",
        variant: "destructive"
      });
    }
  };

  const reactivateDevice = async (userId: string, deviceId: string) => {
    try {
      const { error } = await supabase
        .from('device_subscriptions')
        .update({ 
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', deviceId)
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Device Reactivated",
        description: "The device has been reactivated. Note: Max 2 devices per user.",
      });

      loadDeviceData();
    } catch (error) {
      console.error('Failed to reactivate device:', error);
      toast({
        title: "Error",
        description: "Failed to reactivate device",
        variant: "destructive"
      });
    }
  };

  const getDeviceIcon = (device: DeviceSubscription) => {
    if (device.device_name?.includes('iPhone') || device.device_name?.includes('Android')) {
      return <Smartphone className="h-4 w-4" />;
    }
    if (device.device_name?.includes('iPad')) {
      return <Tablet className="h-4 w-4" />;
    }
    return <Monitor className="h-4 w-4" />;
  };

  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.display_name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.user_id.toLowerCase().includes(query)
    );
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          Loading device data...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Users with Devices</p>
                  <p className="text-2xl font-bold">{stats.total_users_with_devices}</p>
                </div>
                <Users className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Devices</p>
                  <p className="text-2xl font-bold text-green-500">{stats.total_active_devices}</p>
                </div>
                <Bell className="h-8 w-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">2-Device Users</p>
                  <p className="text-2xl font-bold text-blue-500">{stats.users_with_2_devices}</p>
                </div>
                <div className="flex">
                  <Smartphone className="h-6 w-6 text-blue-500 opacity-50" />
                  <Monitor className="h-6 w-6 text-blue-500 opacity-50 -ml-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">iOS / Android / Desktop</p>
                  <p className="text-lg font-bold">
                    {stats.ios_devices} / {stats.android_devices} / {stats.desktop_devices}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Smartphone className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Device Connection Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                User Device Management
              </CardTitle>
              <CardDescription>
                Track and manage user devices for push notifications (Max 2 per user)
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadDeviceData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="flex items-center gap-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or user ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {/* Users Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Active Devices</TableHead>
                  <TableHead>Device Types</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.user_id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{user.display_name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">{user.active_count}</span>
                        <span className="text-muted-foreground">/ 2</span>
                        <Progress 
                          value={(user.active_count / 2) * 100} 
                          className="w-16 h-2"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {user.devices
                          .filter(d => d.is_active)
                          .map((device, idx) => (
                            <Badge key={idx} variant="outline" className="gap-1">
                              {getDeviceIcon(device)}
                              {device.is_mobile ? 'Mobile' : 'Desktop'}
                            </Badge>
                          ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.devices.find(d => d.is_active)?.last_seen_at ? (
                        <span className="text-sm">
                          {formatDistanceToNow(new Date(user.devices.find(d => d.is_active)!.last_seen_at!), { addSuffix: true })}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">Never</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.active_count === 2 ? (
                        <Badge className="bg-green-500">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Max Devices
                        </Badge>
                      ) : user.active_count === 1 ? (
                        <Badge variant="secondary">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          1 Device
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <XCircle className="h-3 w-3 mr-1" />
                          No Active
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setSelectedUser(user)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Devices
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>
                              Devices for {user.display_name || user.email || 'Unknown User'}
                            </DialogTitle>
                            <DialogDescription>
                              {user.active_count} active of {user.total_count} total devices
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 mt-4">
                            {user.devices.map((device) => (
                              <div 
                                key={device.id}
                                className={`p-4 rounded-lg border ${
                                  device.is_active 
                                    ? 'bg-green-500/10 border-green-500/30' 
                                    : 'bg-muted/50 border-muted'
                                }`}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-3">
                                    {getDeviceIcon(device)}
                                    <div>
                                      <p className="font-medium">
                                        {device.device_name || 'Unknown Device'}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {device.browser_name} on {device.platform}
                                      </p>
                                    </div>
                                  </div>
                                  <Badge variant={device.is_active ? "default" : "secondary"}>
                                    {device.is_active ? 'Active' : 'Inactive'}
                                  </Badge>
                                </div>
                                
                                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">Player ID:</span>
                                    <p className="font-mono text-xs truncate">
                                      {device.onesignal_player_id || 'None'}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Last Seen:</span>
                                    <p>
                                      {device.last_seen_at 
                                        ? formatDistanceToNow(new Date(device.last_seen_at), { addSuffix: true })
                                        : 'Never'}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Created:</span>
                                    <p>
                                      {device.created_at 
                                        ? formatDistanceToNow(new Date(device.created_at), { addSuffix: true })
                                        : 'Unknown'}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Welcome Sent:</span>
                                    <p>{device.welcome_sent ? 'Yes' : 'No'}</p>
                                  </div>
                                </div>

                                <div className="mt-3 flex gap-2">
                                  {device.is_active ? (
                                    <Button 
                                      variant="destructive" 
                                      size="sm"
                                      onClick={() => deactivateDevice(user.user_id, device.id)}
                                    >
                                      <BellOff className="h-4 w-4 mr-1" />
                                      Deactivate
                                    </Button>
                                  ) : (
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => reactivateDevice(user.user_id, device.id)}
                                    >
                                      <Bell className="h-4 w-4 mr-1" />
                                      Reactivate
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No users found matching your search.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}



