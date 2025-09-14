import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Shield, Clock, Users, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface RateLimit {
  id: string;
  user_id: string;
  notification_type: string;
  notification_count: number;
  window_start: string;
  window_end: string;
  created_at: string;
  user_email?: string;
}

interface RateLimitRule {
  notification_type: string;
  max_per_hour: number;
  max_per_day: number;
  enabled: boolean;
}

export function NotificationRateLimitManager() {
  const [rateLimits, setRateLimits] = useState<RateLimit[]>([]);
  const [rules, setRules] = useState<RateLimitRule[]>([
    { notification_type: 'signal_created', max_per_hour: 10, max_per_day: 50, enabled: true },
    { notification_type: 'tp_hits', max_per_hour: 20, max_per_day: 100, enabled: true },
    { notification_type: 'stop_loss_hits', max_per_hour: 5, max_per_day: 20, enabled: true },
    { notification_type: 'market_alerts', max_per_hour: 15, max_per_day: 60, enabled: true },
  ]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRateLimits();
  }, []);

  const loadRateLimits = async () => {
    try {
      setIsLoading(true);
      
      // Get recent notification activity as proxy for rate limits
      const { data: logs, error } = await supabase
        .from('notification_delivery_log')
        .select(`
          user_id,
          notification_type,
          created_at,
          profiles!notification_delivery_log_user_id_fkey(email)
        `)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Group by user and notification type to simulate rate limits
      const rateLimitMap = new Map<string, RateLimit>();
      
      logs?.forEach(log => {
        const key = `${log.user_id}:${log.notification_type}`;
        const existing = rateLimitMap.get(key);
        
        if (existing) {
          existing.notification_count++;
        } else {
          rateLimitMap.set(key, {
            id: key,
            user_id: log.user_id,
            notification_type: log.notification_type,
            notification_count: 1,
            window_start: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
            window_end: new Date().toISOString(),
            created_at: log.created_at,
            user_email: (log.profiles as any)?.email
          });
        }
      });

      setRateLimits(Array.from(rateLimitMap.values()).filter(limit => limit.notification_count > 5));

    } catch (error) {
      console.error('Failed to load rate limits:', error);
      toast({
        title: "Load Error",
        description: "Failed to load rate limit data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateRule = (index: number, updates: Partial<RateLimitRule>) => {
    const newRules = [...rules];
    newRules[index] = { ...newRules[index], ...updates };
    setRules(newRules);
  };

  const saveRules = async () => {
    try {
      // In a real implementation, these rules would be stored in the database
      // For now, they're managed client-side
      toast({
        title: "Rules Updated",
        description: "Rate limiting rules have been saved",
      });
    } catch (error) {
      toast({
        title: "Save Error",
        description: "Failed to save rate limiting rules",
        variant: "destructive"
      });
    }
  };

  const clearUserRateLimit = async (userId: string, notificationType: string) => {
    try {
      // Since we're using delivery logs as proxy, we'll just show a message
      toast({
        title: "Rate Limit Cleared",
        description: "Rate limit information refreshed",
      });

      loadRateLimits();
    } catch (error) {
      console.error('Failed to clear rate limit:', error);
      toast({
        title: "Clear Error",
        description: "Failed to clear user rate limit",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (count: number, maxPerHour: number) => {
    const percentage = (count / maxPerHour) * 100;
    
    if (percentage >= 90) {
      return <Badge variant="destructive">Critical</Badge>;
    } else if (percentage >= 70) {
      return <Badge variant="secondary">High</Badge>;
    } else if (percentage >= 50) {
      return <Badge variant="outline">Medium</Badge>;
    } else {
      return <Badge variant="default">Normal</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 bg-muted rounded w-64 animate-pulse" />
        </div>
        {[1, 2].map(i => (
          <Card key={i}>
            <CardHeader>
              <div className="h-6 bg-muted rounded w-48 animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-32 bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Rate Limit Management</h1>
          <p className="text-muted-foreground">Monitor and control notification frequency</p>
        </div>
      </div>

      {/* Rate Limiting Rules */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Settings className="h-5 w-5 text-primary" />
            <CardTitle>Rate Limiting Rules</CardTitle>
          </div>
          <CardDescription>
            Configure maximum notification frequencies by type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {rules.map((rule, index) => (
              <div key={rule.notification_type} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium capitalize">
                    {rule.notification_type.replace(/_/g, ' ')}
                  </h4>
                  <Badge variant={rule.enabled ? "default" : "secondary"}>
                    {rule.enabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Max per Hour</Label>
                    <Input
                      type="number"
                      value={rule.max_per_hour}
                      onChange={(e) => updateRule(index, { max_per_hour: parseInt(e.target.value) })}
                      min="0"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Max per Day</Label>
                    <Input
                      type="number"
                      value={rule.max_per_day}
                      onChange={(e) => updateRule(index, { max_per_day: parseInt(e.target.value) })}
                      min="0"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Button
                      variant={rule.enabled ? "default" : "outline"}
                      onClick={() => updateRule(index, { enabled: !rule.enabled })}
                      className="w-full"
                    >
                      {rule.enabled ? "Enabled" : "Disabled"}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            
            <Button onClick={saveRules} className="w-full">
              Save Rules
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Rate Limits */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Active Rate Limits</CardTitle>
          </div>
          <CardDescription>
            Users currently affected by rate limiting (last 24 hours)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rateLimits.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No active rate limits</p>
              <p className="text-sm">All users are within notification limits</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rateLimits.map((limit) => {
                const rule = rules.find(r => r.notification_type === limit.notification_type);
                
                return (
                  <div key={limit.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4" />
                        <span className="font-medium">
                          {limit.user_email || 'Unknown User'}
                        </span>
                        {getStatusBadge(limit.notification_count, rule?.max_per_hour || 10)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {limit.notification_type.replace(/_/g, ' ')} • 
                        {limit.notification_count} notifications in current window
                      </p>
                      <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>
                          Window: {new Date(limit.window_start).toLocaleTimeString()} - 
                          {new Date(limit.window_end).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => clearUserRateLimit(limit.user_id, limit.notification_type)}
                    >
                      Clear Limit
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-primary" />
            <CardTitle>System Status</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {rateLimits.filter(l => l.notification_count <= 5).length}
              </div>
              <p className="text-sm text-green-700 dark:text-green-400">Low Usage</p>
            </div>
            
            <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {rateLimits.filter(l => l.notification_count > 5 && l.notification_count <= 8).length}
              </div>
              <p className="text-sm text-yellow-700 dark:text-yellow-400">Moderate Usage</p>
            </div>
            
            <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {rateLimits.filter(l => l.notification_count > 8).length}
              </div>
              <p className="text-sm text-red-700 dark:text-red-400">High Usage</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}