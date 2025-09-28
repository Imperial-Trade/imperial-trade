import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, CheckCircle, XCircle, Activity, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface NotificationLog {
  id: string;
  job_name: string;
  execution_time: string;
  records_affected: number;
  status: string;
  error_message: string;
  created_at: string;
}

interface FalsePositiveReport {
  id: string;
  signal_id: string;
  reported_change_types: string[];
  actual_change_data: any;
  notification_sent_at: string;
  false_positive_detected_at: string;
  detection_method: string;
  user_reported: boolean;
}

export const NotificationMonitor: React.FC = () => {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [falsePositives, setFalsePositives] = useState<FalsePositiveReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [healthStatus, setHealthStatus] = useState<{
    total_sent: number;
    success_rate: number;
    false_positive_rate: number;
    avg_response_time: number;
    last_error: string | null;
  } | null>(null);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('cron_job_logs')
        .select('*')
        .eq('job_name', 'enhanced_notification_pipeline')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching notification logs:', error);
      toast.error('Failed to load notification logs');
    }
  };

  const fetchFalsePositives = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_audit_false_positives')
        .select('*')
        .order('false_positive_detected_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setFalsePositives(data || []);
    } catch (error) {
      console.error('Error fetching false positives:', error);
    }
  };

  const calculateHealthMetrics = () => {
    const recentLogs = logs.filter(log => 
      new Date(log.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    );

    const totalSent = recentLogs.filter(log => log.status === 'success').length;
    const totalErrors = recentLogs.filter(log => log.status === 'error').length;
    const skippedNoChanges = recentLogs.filter(log => log.status === 'skipped_no_changes').length;
    
    const successRate = totalSent + totalErrors > 0 ? (totalSent / (totalSent + totalErrors)) * 100 : 100;
    const falsePositiveRate = falsePositives.length > 0 ? (falsePositives.length / totalSent) * 100 : 0;
    
    const lastError = recentLogs.find(log => log.status === 'error')?.error_message || null;

    setHealthStatus({
      total_sent: totalSent,
      success_rate: successRate,
      false_positive_rate: falsePositiveRate,
      avg_response_time: 850, // Mock average response time
      last_error: lastError
    });
  };

  const reportFalsePositive = async (signalId: string, changeTypes: string[]) => {
    try {
      const { error } = await supabase
        .from('notification_audit_false_positives')
        .insert({
          signal_id: signalId,
          reported_change_types: changeTypes,
          actual_change_data: { user_reported: true },
          notification_sent_at: new Date().toISOString(),
          detection_method: 'manual_report',
          user_reported: true
        });

      if (error) throw error;
      toast.success('False positive reported successfully');
      fetchFalsePositives();
    } catch (error) {
      console.error('Error reporting false positive:', error);
      toast.error('Failed to report false positive');
    }
  };

  const cleanupPhantomLogs = async () => {
    try {
      // Call cleanup function directly via SQL query since RPC types aren't updated yet
      const { data, error } = await supabase
        .from('cron_job_logs')
        .delete()
        .eq('job_name', 'enhanced_notification_pipeline')
        .in('status', ['success'])
        .like('error_message', '%Changes: ,%')
        .lt('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString());

      if (error) throw error;
      
      // Also clean false positives
      await supabase
        .from('notification_audit_false_positives')
        .delete()
        .lt('false_positive_detected_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
      
      toast.success('Phantom notifications cleaned up');
      fetchLogs();
    } catch (error) {
      console.error('Error cleaning up phantom notifications:', error);
      toast.error('Failed to cleanup phantom notifications');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchLogs(), fetchFalsePositives()]);
      setIsLoading(false);
    };

    loadData();
    calculateHealthMetrics();
  }, []);

  useEffect(() => {
    if (logs.length > 0) {
      calculateHealthMetrics();
    }
  }, [logs, falsePositives]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Success</Badge>;
      case 'error':
      case 'critical_error':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Error</Badge>;
      case 'skipped_no_changes':
        return <Badge variant="secondary"><Activity className="w-3 h-3 mr-1" />Filtered</Badge>;
      case 'skipped_no_users':
        return <Badge variant="outline"><Activity className="w-3 h-3 mr-1" />No Users</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        Loading notification monitor...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Notification Monitor</h2>
          <p className="text-muted-foreground">Real-time notification system health and diagnostics</p>
        </div>
        <Button onClick={() => { fetchLogs(); fetchFalsePositives(); }} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Health Status Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{healthStatus?.success_rate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notifications Sent</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{healthStatus?.total_sent}</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">False Positives</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{falsePositives.length}</div>
            <p className="text-xs text-muted-foreground">{healthStatus?.false_positive_rate.toFixed(1)}% rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response</CardTitle>
            <Activity className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{healthStatus?.avg_response_time}ms</div>
            <p className="text-xs text-muted-foreground">Processing time</p>
          </CardContent>
        </Card>
      </div>

      {healthStatus?.last_error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Latest Error: {healthStatus.last_error}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="logs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="logs">Recent Logs</TabsTrigger>
          <TabsTrigger value="false-positives">False Positives</TabsTrigger>
          <TabsTrigger value="cleanup">System Cleanup</TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Notification Logs</CardTitle>
              <CardDescription>Latest notification pipeline executions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-start justify-between p-3 border rounded-lg">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(log.status)}
                        <span className="text-sm font-medium">
                          {log.records_affected} users affected
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                      {log.error_message && (
                        <p className="text-sm text-muted-foreground break-words">
                          {log.error_message}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="false-positives" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>False Positive Reports</CardTitle>
              <CardDescription>Notifications sent without actual changes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {falsePositives.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No false positives detected recently
                  </div>
                ) : (
                  falsePositives.map((report) => (
                    <div key={report.id} className="flex items-start justify-between p-3 border rounded-lg">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{report.detection_method}</Badge>
                          <span className="text-sm font-medium">
                            Signal: {report.signal_id.slice(0, 8)}...
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(report.false_positive_detected_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Changes: {report.reported_change_types.join(', ')}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cleanup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Cleanup Tools</CardTitle>
              <CardDescription>Maintenance tools for notification system health</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={cleanupPhantomLogs} variant="outline">
                <XCircle className="w-4 h-4 mr-2" />
                Cleanup Phantom Notifications
              </Button>
              <p className="text-sm text-muted-foreground">
                Remove invalid notification logs and clean up false positive records older than 7 days.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};