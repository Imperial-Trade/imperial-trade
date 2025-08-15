/**
 * Emergency OneSignal Diagnostic Panel - Phase 6: Comprehensive Monitoring
 * Critical tool for monitoring and fixing the OneSignal push notification pipeline
 */

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, CheckCircle, RefreshCw, Zap, Users, Bell, Database, Activity } from "lucide-react";
import { toast } from "sonner";

interface EmergencyStats {
  total_users: number;
  users_with_player_id: number;
  users_without_player_id: number;
  active_subscriptions: number;
  inactive_subscriptions: number;
  ios_pwa_users: number;
  player_id_capture_rate: number;
  recent_failures: number;
  last_sync_success: string | null;
}

interface EmergencyTestResult {
  test_type: string;
  success: boolean;
  error?: string;
  data?: any;
  timestamp: string;
}

export default function OneSignalEmergencyPanel() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState<EmergencyStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<EmergencyTestResult[]>([]);
  const [isRunningEmergencyFix, setIsRunningEmergencyFix] = useState(false);

  // Only show for admins
  if (!user || profile?.access_level !== 'admin') {
    return null;
  }

  const fetchEmergencyStats = async () => {
    setIsLoading(true);
    try {
      // Get comprehensive user statistics
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, onesignal_player_id, push_subscription_active, onesignal_subscription_status, user_type, created_at, onesignal_last_verified_at')
        .eq('account_status', 'active');

      if (profilesError) throw profilesError;

      const totalUsers = profiles.length;
      const usersWithPlayerId = profiles.filter(p => p.onesignal_player_id).length;
      const usersWithoutPlayerId = totalUsers - usersWithPlayerId;
      const activeSubscriptions = profiles.filter(p => p.push_subscription_active).length;
      const inactiveSubscriptions = totalUsers - activeSubscriptions;
      
      // Estimate iOS PWA users based on tags (this is approximate)
      const iosPwaUsers = Math.floor(totalUsers * 0.3); // Rough estimate
      
      const playerIdCaptureRate = totalUsers > 0 ? (usersWithPlayerId / totalUsers) * 100 : 0;
      
      // Count recent failures (users with active subscription but no player ID)
      const recentFailures = profiles.filter(p => p.push_subscription_active && !p.onesignal_player_id).length;
      
      // Find most recent successful sync
      const lastSyncSuccess = profiles
        .filter(p => p.onesignal_last_verified_at)
        .sort((a, b) => new Date(b.onesignal_last_verified_at).getTime() - new Date(a.onesignal_last_verified_at).getTime())[0]
        ?.onesignal_last_verified_at || null;

      setStats({
        total_users: totalUsers,
        users_with_player_id: usersWithPlayerId,
        users_without_player_id: usersWithoutPlayerId,
        active_subscriptions: activeSubscriptions,
        inactive_subscriptions: inactiveSubscriptions,
        ios_pwa_users: iosPwaUsers,
        player_id_capture_rate: playerIdCaptureRate,
        recent_failures: recentFailures,
        last_sync_success: lastSyncSuccess
      });

    } catch (error) {
      console.error('Failed to fetch emergency stats:', error);
      toast.error('Failed to load emergency statistics');
    } finally {
      setIsLoading(false);
    }
  };

  const runEmergencyPlayerIdFix = async () => {
    setIsRunningEmergencyFix(true);
    try {
      console.log('🚨 Running emergency Player ID fix...');
      
      const { data: fixResult, error: fixError } = await supabase.functions.invoke('onesignal-player-id-emergency-fix');
      
      if (fixError) {
        console.error('❌ Emergency fix failed:', fixError);
        toast.error(`Emergency Fix Failed: ${fixError.message || "Unknown error occurred"}`);
        return;
      }
      
      console.log('✅ Emergency fix completed:', fixResult);
      
      toast.success(`Emergency Fix Complete: Processed ${fixResult.results?.total_users || 0} users. ${fixResult.results?.successful_operations || 0} successful, ${fixResult.results?.failed_operations || 0} failed.`);
      
      // Refresh stats after fix
      await fetchEmergencyStats();
      
    } catch (error) {
      console.error('Emergency fix failed:', error);
      toast.error("Emergency Fix Failed - Check console for details");
    } finally {
      setIsRunningEmergencyFix(false);
    }
  };

  const testNotificationPipeline = async () => {
    try {
      toast.info('🧪 Testing notification pipeline...');
      
      const { data, error } = await supabase.functions.invoke('onesignal-test-notification', {
        body: {
          test_type: 'emergency_pipeline_test',
          target_user_id: user.id,
          message: 'Emergency pipeline test from admin panel',
          emergency_mode: true
        }
      });

      const testResult: EmergencyTestResult = {
        test_type: 'notification_pipeline',
        success: !error && data?.success,
        error: error?.message || data?.error,
        data: data,
        timestamp: new Date().toISOString()
      };

      setTestResults(prev => [testResult, ...prev.slice(0, 9)]);

      if (testResult.success) {
        toast.success('✅ Notification pipeline test successful!');
      } else {
        toast.error('❌ Notification pipeline test failed');
      }

    } catch (error) {
      console.error('Pipeline test failed:', error);
      toast.error('Pipeline test failed: ' + error.message);
    }
  };

  const testEdgeFunction = async (functionName: string) => {
    try {
      toast.info(`🔧 Testing ${functionName}...`);
      
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { test: true, emergency_mode: true }
      });

      const testResult: EmergencyTestResult = {
        test_type: `edge_function_${functionName}`,
        success: !error,
        error: error?.message,
        data: data,
        timestamp: new Date().toISOString()
      };

      setTestResults(prev => [testResult, ...prev.slice(0, 9)]);

      if (testResult.success) {
        toast.success(`✅ ${functionName} test successful!`);
      } else {
        toast.error(`❌ ${functionName} test failed`);
      }

    } catch (error) {
      console.error(`${functionName} test failed:`, error);
      toast.error(`${functionName} test failed: ` + error.message);
    }
  };

  useEffect(() => {
    fetchEmergencyStats();
  }, []);

  const getHealthStatus = (rate: number) => {
    if (rate >= 90) return { status: 'Excellent', color: 'text-green-600', icon: CheckCircle };
    if (rate >= 70) return { status: 'Good', color: 'text-blue-600', icon: CheckCircle };
    if (rate >= 50) return { status: 'Warning', color: 'text-yellow-600', icon: AlertTriangle };
    return { status: 'Critical', color: 'text-red-600', icon: AlertTriangle };
  };

  const captureRateHealth = stats ? getHealthStatus(stats.player_id_capture_rate) : null;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-red-500" />
          Emergency OneSignal Diagnostics
        </CardTitle>
        <CardDescription>
          Critical monitoring and emergency fixes for the OneSignal push notification pipeline
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Emergency Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex flex-col items-center p-4 border rounded-lg">
            <Users className="h-8 w-8 text-blue-500 mb-2" />
            <div className="text-2xl font-bold">{stats?.total_users || 0}</div>
            <div className="text-sm text-muted-foreground">Total Users</div>
          </div>
          
          <div className="flex flex-col items-center p-4 border rounded-lg">
            <Database className="h-8 w-8 text-green-500 mb-2" />
            <div className="text-2xl font-bold">{stats?.users_with_player_id || 0}</div>
            <div className="text-sm text-muted-foreground">With Player ID</div>
          </div>
          
          <div className="flex flex-col items-center p-4 border rounded-lg">
            <AlertTriangle className="h-8 w-8 text-red-500 mb-2" />
            <div className="text-2xl font-bold">{stats?.users_without_player_id || 0}</div>
            <div className="text-sm text-muted-foreground">Missing Player ID</div>
          </div>
          
          <div className="flex flex-col items-center p-4 border rounded-lg">
            <Bell className="h-8 w-8 text-purple-500 mb-2" />
            <div className="text-2xl font-bold">{stats?.active_subscriptions || 0}</div>
            <div className="text-sm text-muted-foreground">Active Subs</div>
          </div>
        </div>

        {/* Health Status */}
        {captureRateHealth && (
          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-5 w-5" />
              <span className="font-medium">Player ID Capture Health</span>
            </div>
            <div className="flex items-center gap-3">
              <captureRateHealth.icon className={`h-6 w-6 ${captureRateHealth.color}`} />
              <div>
                <div className="text-2xl font-bold">{stats?.player_id_capture_rate.toFixed(1)}%</div>
                <div className={`text-sm ${captureRateHealth.color}`}>{captureRateHealth.status}</div>
              </div>
              {stats && stats.recent_failures > 0 && (
                <Badge variant="destructive" className="ml-auto">
                  {stats.recent_failures} failures
                </Badge>
              )}
            </div>
          </div>
        )}

        <Separator />

        {/* Emergency Actions */}
        <div className="space-y-3">
          <h3 className="font-medium">Emergency Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button 
              onClick={fetchEmergencyStats} 
              disabled={isLoading}
              variant="outline"
              className="justify-start"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Stats
            </Button>
            
            <Button 
              onClick={runEmergencyPlayerIdFix}
              disabled={isRunningEmergencyFix}
              variant="destructive"
              className="justify-start"
            >
              <Zap className={`h-4 w-4 mr-2 ${isRunningEmergencyFix ? 'animate-pulse' : ''}`} />
              Emergency Player ID Fix
            </Button>
            
            <Button 
              onClick={testNotificationPipeline}
              variant="outline"
              className="justify-start"
            >
              <Bell className="h-4 w-4 mr-2" />
              Test Pipeline
            </Button>
            
            <Button 
              onClick={() => testEdgeFunction('onesignal-upsert-user')}
              variant="outline"
              className="justify-start"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Test Upsert Function
            </Button>
          </div>
        </div>

        {/* Test Results */}
        {testResults.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h3 className="font-medium">Recent Test Results</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {testResults.map((result, index) => (
                  <div key={index} className="p-3 border rounded-lg text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-medium">{result.test_type}</div>
                      <Badge variant={result.success ? "default" : "destructive"}>
                        {result.success ? "Success" : "Failed"}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mb-1">
                      {new Date(result.timestamp).toLocaleString()}
                    </div>
                    {result.error && (
                      <div className="text-xs text-red-600 mt-1">{result.error}</div>
                    )}
                    {result.data && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {typeof result.data === 'object' ? JSON.stringify(result.data, null, 2) : result.data}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}