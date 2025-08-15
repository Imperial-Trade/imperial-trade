/**
 * Admin Test Notification Panel
 * Allows admins to test the OneSignal notification pipeline
 */

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send, TestTube, Users, AlertCircle, CheckCircle } from "lucide-react";

export default function TestNotificationPanel() {
  const { profile } = useAuth();
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);

  // Only show for admins
  if (profile?.access_level !== 'admin') {
    return null;
  }

  const runNotificationTest = async () => {
    setIsTesting(true);
    setTestResults(null);

    try {
      toast.info("Testing notification pipeline...");

      const { data, error } = await supabase.functions.invoke('onesignal-test-notification');

      if (error) {
        console.error('Test failed:', error);
        toast.error("Test failed: " + error.message);
        setTestResults({ success: false, error: error.message });
        return;
      }

      console.log('Test results:', data);
      setTestResults(data);

      if (data?.success) {
        toast.success(`Test notifications sent to ${data.users_count} users!`);
      } else {
        toast.warning(data?.message || "Test completed with warnings");
      }

    } catch (error: any) {
      console.error('Test error:', error);
      toast.error("Test error: " + error.message);
      setTestResults({ success: false, error: error.message });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          Notification Pipeline Test
        </CardTitle>
        <CardDescription>
          Test the complete OneSignal notification pipeline including iOS PWA users
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Button 
            onClick={runNotificationTest} 
            disabled={isTesting}
            className="flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            {isTesting ? "Testing..." : "Run Test"}
          </Button>
          
          {testResults && (
            <Badge variant={testResults.success ? "default" : "destructive"}>
              {testResults.success ? (
                <CheckCircle className="h-3 w-3 mr-1" />
              ) : (
                <AlertCircle className="h-3 w-3 mr-1" />
              )}
              {testResults.success ? "Success" : "Failed"}
            </Badge>
          )}
        </div>

        {testResults && (
          <div className="space-y-3 p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <span className="font-medium">Test Results</span>
              <Badge variant="outline" className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {testResults.users_count || 0} users
              </Badge>
            </div>

            {testResults.success ? (
              <div className="space-y-2">
                <div className="text-sm text-green-600 dark:text-green-400">
                  ✅ {testResults.message}
                </div>
                
                {testResults.users_with_player_ids && (
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">Users with Player IDs:</div>
                    <div className="space-y-1">
                      {testResults.users_with_player_ids.map((user: any, index: number) => (
                        <div key={index} className="text-xs flex items-center justify-between bg-background p-2 rounded">
                          <span>{user.display_name || 'Anonymous'}</span>
                          <Badge variant="outline">
                            {user.player_id_preview}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {testResults.onesignal_result && (
                  <div className="text-xs">
                    <div className="font-medium text-muted-foreground">OneSignal Response:</div>
                    <div className="bg-background p-2 rounded font-mono text-xs">
                      Recipients: {testResults.onesignal_result.recipients || 0}
                      {testResults.onesignal_result.id && (
                        <div>ID: {testResults.onesignal_result.id}</div>
                      )}
                    </div>
                  </div>
                )}

                {testResults.dispatcher_test && (
                  <div className="text-xs">
                    <div className="font-medium text-muted-foreground">Dispatcher Test:</div>
                    <Badge variant={testResults.dispatcher_test.success ? "default" : "destructive"}>
                      {testResults.dispatcher_test.success ? "✅ Success" : "❌ Failed"}
                    </Badge>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-red-600 dark:text-red-400">
                ❌ {testResults.message || testResults.error}
                {testResults.recommendation && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    💡 {testResults.recommendation}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          This test will send a test notification to all users with valid OneSignal Player IDs
          and verify the signal-notification-dispatcher edge function works correctly.
        </div>
      </CardContent>
    </Card>
  );
}