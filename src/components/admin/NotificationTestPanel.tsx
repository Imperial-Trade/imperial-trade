import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Bell, Send, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export const NotificationTestPanel: React.FC = () => {
  const { user } = useAuth();
  const [testType, setTestType] = useState<"self" | "single_user" | "admins">(
    "self"
  );
  const [targetUserId, setTargetUserId] = useState("");
  const [testMessage, setTestMessage] = useState(
    "Test notification from Imperial Trading Platform"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  const handleSendTest = async () => {
    if (!user) return;

    if (testType === "single_user" && !targetUserId.trim()) {
      toast({
        title: "Target User Required",
        description: "Please enter a target user ID for single user tests",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setLastResult(null);

    try {
      const { data, error } = await supabase.functions.invoke(
        "onesignal-test-notification",
        {
          body: {
            test_type: testType,
            target_user_id:
              testType === "single_user" ? targetUserId.trim() : undefined,
            test_message: testMessage,
          },
        }
      );

      if (error) {
        logger.error("Test notification error:", error);
        toast({
          title: "Test Failed",
          description: error.message || "Failed to send test notification",
          variant: "destructive",
        });
        setLastResult({ success: false, error: error.message });
        return;
      }

      logger.log("Test notification result:", data);
      setLastResult(data);

      if (data.success) {
        toast({
          title: "Test Sent Successfully",
          description: `Notification sent to ${data.recipients} recipient(s)`,
        });
      } else {
        toast({
          title: "Test Failed",
          description: data.error || "Unknown error occurred",
          variant: "destructive",
        });
      }
    } catch (err) {
      logger.error("Test notification error:", err);
      toast({
        title: "Test Failed",
        description: "Network error or server unavailable",
        variant: "destructive",
      });
      setLastResult({ success: false, error: "Network error" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Test Notifications
        </CardTitle>
        <CardDescription>
          Send test push notifications to verify delivery and troubleshoot
          issues
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="test-type">Test Type</Label>
            <Select
              value={testType}
              onValueChange={(value: any) => setTestType(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="self">Send to myself</SelectItem>
                <SelectItem value="single_user">
                  Send to specific user
                </SelectItem>
                <SelectItem value="admins">Send to all admins</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {testType === "single_user" && (
            <div className="space-y-2">
              <Label htmlFor="target-user">Target User ID</Label>
              <Input
                id="target-user"
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                placeholder="Enter user UUID"
              />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="test-message">Test Message</Label>
          <Textarea
            id="test-message"
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            placeholder="Enter test notification message"
            rows={3}
          />
        </div>

        <Button
          onClick={handleSendTest}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending Test...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Send Test Notification
            </>
          )}
        </Button>

        {lastResult && (
          <div className="mt-4 p-4 rounded-lg border bg-muted/50">
            <div className="flex items-center gap-2 mb-2">
              {lastResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <span className="font-medium">
                {lastResult.success ? "Test Successful" : "Test Failed"}
              </span>
              {lastResult.success && (
                <Badge variant="secondary">
                  {lastResult.recipients} recipient(s)
                </Badge>
              )}
            </div>

            {lastResult.success ? (
              <div className="text-sm text-muted-foreground space-y-1">
                <p>
                  <strong>Type:</strong> {lastResult.test_type}
                </p>
                <p>
                  <strong>Message:</strong> {lastResult.message}
                </p>
                {lastResult.onesignal_result?.id && (
                  <p>
                    <strong>OneSignal ID:</strong>{" "}
                    {lastResult.onesignal_result.id}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-red-600">{lastResult.error}</p>
            )}
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <p>
            <strong>Note:</strong> Test notifications help verify:
          </p>
          <ul className="list-disc list-inside ml-4 mt-1">
            <li>OneSignal integration is working</li>
            <li>Users are properly subscribed</li>
            <li>Notification delivery pipeline</li>
            <li>Push permissions are granted</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
