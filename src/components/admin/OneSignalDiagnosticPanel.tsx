/**
 * OneSignal Diagnostic Panel - PHASE 6: Comprehensive Monitoring & Testing
 * Provides admin interface for testing and monitoring the complete OneSignal notification pipeline
 */

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { 
  Activity, 
  Users, 
  Bell, 
  Send, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Smartphone,
  Monitor,
  Globe
} from "lucide-react";

interface DiagnosticStats {
  totalUsers: number;
  usersWithPlayerIds: number;
  activeSubscriptions: number;
  iosUsers: number;
  pwaUsers: number;
  lastNotificationSent?: string;
}

interface TestResult {
  success: boolean;
  message: string;
  details?: any;
  timestamp: string;
}

export default function OneSignalDiagnosticPanel() {
  const { profile } = useAuth();
  const [diagnosticStats, setDiagnosticStats] = useState<DiagnosticStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  
  // Test form state
  const [testType, setTestType] = useState<'broadcast' | 'specific_user' | 'player_id'>('broadcast');
  const [testMessage, setTestMessage] = useState('Test notification from Imperial Trading Platform');
  const [testTitle, setTestTitle] = useState('Test Notification');
  const [targetUserId, setTargetUserId] = useState('');
  const [targetPlayerId, setTargetPlayerId] = useState('');

  // Only show for admins
  if (profile?.access_level !== 'admin') {
    return null;
  }

  const fetchDiagnosticStats = async () => {
    setIsLoading(true);
    try {
      // Get user statistics
      const { data: allUsers } = await supabase
        .from('profiles')
        .select('id, onesignal_player_id, push_subscription_active, onesignal_subscription_status')
        .eq('account_status', 'active');

      if (!allUsers) throw new Error('Failed to fetch user data');

      const usersWithPlayerIds = allUsers.filter(u => u.onesignal_player_id).length;
      const activeSubscriptions = allUsers.filter(u => u.push_subscription_active).length;

      // Get platform-specific stats (simplified - would need more detailed platform detection)
      const iosUsers = allUsers.filter(u => u.onesignal_subscription_status?.includes('ios')).length;
      const pwaUsers = allUsers.filter(u => u.onesignal_subscription_status?.includes('pwa')).length;

      // Get last notification sent
      const { data: lastNotification } = await supabase
        .from('notification_delivery_log')
        .select('sent_at')
        .eq('delivery_channel', 'push')
        .order('sent_at', { ascending: false })
        .limit(1)
        .single();

      setDiagnosticStats({
        totalUsers: allUsers.length,
        usersWithPlayerIds,
        activeSubscriptions,
        iosUsers,
        pwaUsers,
        lastNotificationSent: lastNotification?.sent_at
      });

    } catch (error) {
      console.error('Failed to fetch diagnostic stats:', error);
      toast.error('Failed to load diagnostic data');
    } finally {
      setIsLoading(false);
    }
  };

  const runPipelineTest = async () => {
    setIsLoading(true);
    try {
      const payload: any = {
        test_type: testType,
        message: testMessage,
        title: testTitle
      };

      if (testType === 'specific_user' && targetUserId) {
        payload.target_user_id = targetUserId;
      }
      
      if (testType === 'player_id' && targetPlayerId) {
        payload.target_player_id = targetPlayerId;
      }

      console.log('Running notification test with payload:', payload);

      const { data, error } = await supabase.functions.invoke('onesignal-test-notification', {
        body: payload
      });

      if (error) throw error;

      const result: TestResult = {
        success: data?.success || false,
        message: data?.message || 'Test completed',
        details: data,
        timestamp: new Date().toISOString()
      };

      setTestResults(prev => [result, ...prev.slice(0, 4)]); // Keep last 5 results

      if (result.success) {
        toast.success('Notification test successful!');
      } else {
        toast.error('Notification test failed');
      }

    } catch (error) {
      console.error('Pipeline test failed:', error);
      const result: TestResult = {
        success: false,
        message: `Test failed: ${error.message}`,
        timestamp: new Date().toISOString()
      };
      setTestResults(prev => [result, ...prev.slice(0, 4)]);
      toast.error('Test failed');
    } finally {
      setIsLoading(false);
    }
  };

  const testEdgeFunction = async (functionName: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { test: true }
      });

      if (error) throw error;

      const result: TestResult = {
        success: true,
        message: `${functionName} is working correctly`,
        details: data,
        timestamp: new Date().toISOString()
      };

      setTestResults(prev => [result, ...prev.slice(0, 4)]);
      toast.success(`${functionName} test successful`);

    } catch (error) {
      console.error(`${functionName} test failed:`, error);
      const result: TestResult = {
        success: false,
        message: `${functionName} failed: ${error.message}`,
        timestamp: new Date().toISOString()
      };
      setTestResults(prev => [result, ...prev.slice(0, 4)]);
      toast.error(`${functionName} test failed`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagnosticStats();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            OneSignal Diagnostic Panel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{diagnosticStats?.totalUsers || 0}</div>
              <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                <Users className="h-4 w-4" />
                Total Users
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{diagnosticStats?.usersWithPlayerIds || 0}</div>
              <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                <Bell className="h-4 w-4" />
                With Player IDs
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{diagnosticStats?.activeSubscriptions || 0}</div>
              <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                <CheckCircle className="h-4 w-4" />
                Active Subs
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{diagnosticStats?.iosUsers || 0}</div>
              <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                <Smartphone className="h-4 w-4" />
                iOS Users
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{diagnosticStats?.pwaUsers || 0}</div>
              <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                <Globe className="h-4 w-4" />
                PWA Users
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={fetchDiagnosticStats} 
              disabled={isLoading}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Stats
            </Button>
            
            <Button 
              onClick={() => testEdgeFunction('onesignal-upsert-user')} 
              disabled={isLoading}
              variant="outline"
              size="sm"
            >
              Test Upsert Function
            </Button>
            
            <Button 
              onClick={() => testEdgeFunction('signal-notification-dispatcher')} 
              disabled={isLoading}
              variant="outline"
              size="sm"
            >
              Test Dispatcher
            </Button>
          </div>

          {/* Test Notification Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Test Notification Pipeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="test-type">Test Type</Label>
                  <Select value={testType} onValueChange={(value: any) => setTestType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="broadcast">Broadcast to All</SelectItem>
                      <SelectItem value="specific_user">Specific User</SelectItem>
                      <SelectItem value="player_id">Specific Player ID</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {testType === 'specific_user' && (
                  <div>
                    <Label htmlFor="target-user">Target User ID</Label>
                    <Input
                      id="target-user"
                      value={targetUserId}
                      onChange={(e) => setTargetUserId(e.target.value)}
                      placeholder="Enter Supabase user ID"
                    />
                  </div>
                )}

                {testType === 'player_id' && (
                  <div>
                    <Label htmlFor="target-player">Target Player ID</Label>
                    <Input
                      id="target-player"
                      value={targetPlayerId}
                      onChange={(e) => setTargetPlayerId(e.target.value)}
                      placeholder="Enter OneSignal Player ID"
                    />
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="test-title">Notification Title</Label>
                <Input
                  id="test-title"
                  value={testTitle}
                  onChange={(e) => setTestTitle(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="test-message">Test Message</Label>
                <Textarea
                  id="test-message"
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  rows={3}
                />
              </div>

              <Button 
                onClick={runPipelineTest} 
                disabled={isLoading}
                className="w-full"
              >
                <Send className={`h-4 w-4 mr-2 ${isLoading ? 'animate-pulse' : ''}`} />
                {isLoading ? 'Sending Test...' : 'Send Test Notification'}
              </Button>
            </CardContent>
          </Card>

          {/* Test Results */}
          {testResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Test Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {testResults.map((result, index) => (
                  <Alert key={index} className={result.success ? 'border-green-200' : 'border-red-200'}>
                    <div className="flex items-start gap-2">
                      {result.success ? (
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <AlertDescription>
                          <div className="font-medium">{result.message}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {new Date(result.timestamp).toLocaleString()}
                          </div>
                          {result.details && (
                            <details className="mt-2">
                              <summary className="cursor-pointer text-xs text-primary">Show Details</summary>
                              <pre className="text-xs mt-1 p-2 bg-muted rounded overflow-auto">
                                {JSON.stringify(result.details, null, 2)}
                              </pre>
                            </details>
                          )}
                        </AlertDescription>
                      </div>
                    </div>
                  </Alert>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Health Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Player ID Capture Rate</span>
                  <Badge variant={
                    (diagnosticStats?.usersWithPlayerIds || 0) / Math.max(diagnosticStats?.totalUsers || 1, 1) > 0.8 
                      ? 'default' 
                      : 'destructive'
                  }>
                    {diagnosticStats ? 
                      Math.round((diagnosticStats.usersWithPlayerIds / Math.max(diagnosticStats.totalUsers, 1)) * 100) + '%'
                      : '0%'
                    }
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Active Subscriptions</span>
                  <Badge variant={
                    (diagnosticStats?.activeSubscriptions || 0) > 0 ? 'default' : 'secondary'
                  }>
                    {diagnosticStats?.activeSubscriptions || 0}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Last Notification</span>
                  <Badge variant="outline">
                    {diagnosticStats?.lastNotificationSent 
                      ? new Date(diagnosticStats.lastNotificationSent).toLocaleDateString()
                      : 'None'
                    }
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}