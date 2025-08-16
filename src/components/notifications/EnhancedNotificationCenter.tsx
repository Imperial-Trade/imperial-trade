import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEnhancedNotifications } from '@/hooks/useEnhancedNotifications';
import { formatDistanceToNow } from 'date-fns';
import { 
  Bell, 
  BellOff, 
  Settings, 
  TrendingUp, 
  AlertTriangle, 
  DollarSign, 
  Activity,
  Volume2,
  VolumeX,
  Smartphone,
  Clock,
  Filter,
  TestTube,
  BarChart3
} from 'lucide-react';

const EnhancedNotificationCenter: React.FC = () => {
  const {
    preferences,
    stats,
    notifications,
    isLoading,
    updatePreferences,
    testNotification,
    playNotificationSound,
    markNotificationAsRead,
    clearAllNotifications,
    getUnreadCount,
    refreshData
  } = useEnhancedNotifications();

  const [activeTab, setActiveTab] = useState<string>('notifications');
  const [filterType, setFilterType] = useState<string>('all');

  const unreadCount = getUnreadCount();
  const filteredNotifications = notifications.filter(n => 
    filterType === 'all' || n.type === filterType
  );

  const handleNotificationClick = (notificationId: string) => {
    markNotificationAsRead(notificationId);
  };

  const handlePreferenceChange = (path: string[], value: any) => {
    if (!preferences) return;
    
    const newPreferences = { ...preferences };
    let current: any = newPreferences;
    
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]];
    }
    current[path[path.length - 1]] = value;
    
    updatePreferences(newPreferences);
  };

  const getPriorityIcon = (priority: number) => {
    if (priority >= 3) return <AlertTriangle className="h-4 w-4 text-destructive" />;
    if (priority >= 2) return <TrendingUp className="h-4 w-4 text-warning" />;
    return <Activity className="h-4 w-4 text-muted-foreground" />;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'signal_created': return <TrendingUp className="h-4 w-4 text-primary" />;
      case 'tp_hit': return <DollarSign className="h-4 w-4 text-success" />;
      case 'stop_loss': return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'price_alert': return <BarChart3 className="h-4 w-4 text-info" />;
      default: return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Enhanced Notification Center
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadCount}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Manage your trading alerts and notification preferences
            </CardDescription>
          </div>
          <Button onClick={refreshData} variant="outline" size="sm">
            <Activity className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="notifications">
              Notifications
              {unreadCount > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="testing">Testing</TabsTrigger>
          </TabsList>

          <TabsContent value="notifications" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter notifications" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Notifications</SelectItem>
                    <SelectItem value="signal_created">New Signals</SelectItem>
                    <SelectItem value="tp_hit">Take Profits</SelectItem>
                    <SelectItem value="stop_loss">Stop Losses</SelectItem>
                    <SelectItem value="price_alert">Price Alerts</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {notifications.length > 0 && (
                <Button 
                  onClick={clearAllNotifications} 
                  variant="outline" 
                  size="sm"
                >
                  Clear All
                </Button>
              )}
            </div>

            <ScrollArea className="h-96 w-full rounded-md border p-4">
              {filteredNotifications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No notifications found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredNotifications.map((notification) => (
                    <Card 
                      key={notification.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        !notification.read ? 'border-primary/50 bg-primary/5' : ''
                      }`}
                      onClick={() => handleNotificationClick(notification.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 pt-1">
                            {getNotificationIcon(notification.type)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-sm">{notification.title}</h4>
                              {getPriorityIcon(notification.priority)}
                              {!notification.read && (
                                <Badge variant="secondary" className="text-xs">New</Badge>
                              )}
                            </div>
                            
                            <p className="text-sm text-muted-foreground mb-2">
                              {notification.message}
                            </p>
                            
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                              </span>
                              
                              <Badge variant="outline" className="text-xs">
                                {notification.source}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-6">
            {preferences && (
              <>
                {/* Trading Notifications */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Trading Notifications</CardTitle>
                    <CardDescription>
                      Configure alerts for different trading events
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Object.entries(preferences.trading).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <div>
                          <Label className="capitalize">{key.replace('_', ' ')}</Label>
                          <p className="text-sm text-muted-foreground">
                            Priority: {value.priority} • Sound: {value.sound}
                          </p>
                        </div>
                        <Switch
                          checked={value.enabled}
                          onCheckedChange={(enabled) => 
                            handlePreferenceChange(['trading', key, 'enabled'], enabled)
                          }
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Delivery Channels */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Delivery Channels</CardTitle>
                    <CardDescription>
                      Choose how you want to receive notifications
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Object.entries(preferences.channels).map(([channel, settings]) => (
                      <div key={channel} className="flex items-center justify-between">
                        <div>
                          <Label className="capitalize">{channel}</Label>
                          <p className="text-sm text-muted-foreground">
                            Threshold: {settings.priority_threshold}
                          </p>
                        </div>
                        <Switch
                          checked={settings.enabled}
                          onCheckedChange={(enabled) => 
                            handlePreferenceChange(['channels', channel, 'enabled'], enabled)
                          }
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Schedule Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Schedule Settings</CardTitle>
                    <CardDescription>
                      Control when you receive notifications
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Quiet Hours</Label>
                      <Switch
                        checked={preferences.schedule.quiet_hours.enabled}
                        onCheckedChange={(enabled) => 
                          handlePreferenceChange(['schedule', 'quiet_hours', 'enabled'], enabled)
                        }
                      />
                    </div>
                    
                    {preferences.schedule.quiet_hours.enabled && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Start Time</Label>
                          <Input
                            type="time"
                            value={preferences.schedule.quiet_hours.start}
                            onChange={(e) => 
                              handlePreferenceChange(['schedule', 'quiet_hours', 'start'], e.target.value)
                            }
                          />
                        </div>
                        <div>
                          <Label>End Time</Label>
                          <Input
                            type="time"
                            value={preferences.schedule.quiet_hours.end}
                            onChange={(e) => 
                              handlePreferenceChange(['schedule', 'quiet_hours', 'end'], e.target.value)
                            }
                          />
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <Label>Market Hours Only</Label>
                      <Switch
                        checked={preferences.schedule.market_hours_only}
                        onCheckedChange={(enabled) => 
                          handlePreferenceChange(['schedule', 'market_hours_only'], enabled)
                        }
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label>Weekend Alerts</Label>
                      <Switch
                        checked={preferences.schedule.weekend_alerts}
                        onCheckedChange={(enabled) => 
                          handlePreferenceChange(['schedule', 'weekend_alerts'], enabled)
                        }
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Device Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Device Settings</CardTitle>
                    <CardDescription>
                      Configure device-specific notification behavior
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4" />
                        <Label>Vibration</Label>
                      </div>
                      <Switch
                        checked={preferences.device.vibration}
                        onCheckedChange={(enabled) => 
                          handlePreferenceChange(['device', 'vibration'], enabled)
                        }
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label>LED Flash</Label>
                      <Switch
                        checked={preferences.device.led_flash}
                        onCheckedChange={(enabled) => 
                          handlePreferenceChange(['device', 'led_flash'], enabled)
                        }
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label>Priority Bypass</Label>
                      <Switch
                        checked={preferences.device.priority_bypass}
                        onCheckedChange={(enabled) => 
                          handlePreferenceChange(['device', 'priority_bypass'], enabled)
                        }
                      />
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {stats.total_sent > 0 
                        ? Math.round((stats.total_delivered / stats.total_sent) * 100)
                        : 0
                      }%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {stats.total_delivered} of {stats.total_sent} sent
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Engagement Score</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.engagement_score}</div>
                    <p className="text-xs text-muted-foreground">
                      Based on open rates
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Opened</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.total_opened}</div>
                    <p className="text-xs text-muted-foreground">
                      Notifications interacted with
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="testing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Notification Testing</CardTitle>
                <CardDescription>
                  Test different notification types and sounds
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    onClick={() => testNotification('signal_created')}
                    variant="outline"
                    className="h-16"
                  >
                    <div className="text-center">
                      <TrendingUp className="h-5 w-5 mx-auto mb-1" />
                      <div className="text-sm">Signal Created</div>
                    </div>
                  </Button>
                  
                  <Button
                    onClick={() => testNotification('tp_hit')}
                    variant="outline"
                    className="h-16"
                  >
                    <div className="text-center">
                      <DollarSign className="h-5 w-5 mx-auto mb-1" />
                      <div className="text-sm">Take Profit</div>
                    </div>
                  </Button>
                  
                  <Button
                    onClick={() => testNotification('stop_loss')}
                    variant="outline"
                    className="h-16"
                  >
                    <div className="text-center">
                      <AlertTriangle className="h-5 w-5 mx-auto mb-1" />
                      <div className="text-sm">Stop Loss</div>
                    </div>
                  </Button>
                  
                  <Button
                    onClick={() => testNotification('price_alert')}
                    variant="outline"
                    className="h-16"
                  >
                    <div className="text-center">
                      <BarChart3 className="h-5 w-5 mx-auto mb-1" />
                      <div className="text-sm">Price Alert</div>
                    </div>
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <Label>Sound Testing</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {['signal_alert', 'success_ding', 'warning_tone'].map((sound) => (
                      <Button
                        key={sound}
                        onClick={() => playNotificationSound(sound)}
                        variant="outline"
                        size="sm"
                      >
                        <Volume2 className="h-4 w-4 mr-2" />
                        {sound.replace('_', ' ')}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default EnhancedNotificationCenter;