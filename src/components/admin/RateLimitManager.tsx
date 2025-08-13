import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const RateLimitManager: React.FC = () => {
  const [email, setEmail] = useState("");
  const [ip, setIp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [rateLimits, setRateLimits] = useState<any[]>([]);

  const loadRateLimits = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("rate_limits")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setRateLimits(data || []);
    } catch (error) {
      logger.error("Error loading rate limits:", error);
      toast.error("Failed to load rate limits");
    } finally {
      setIsLoading(false);
    }
  };

  const clearEmailRateLimit = async () => {
    if (!email) {
      toast.error("Please enter an email address");
      return;
    }

    try {
      setIsLoading(true);
      const { error } = await supabase
        .from("rate_limits")
        .delete()
        .eq("identifier", email.toLowerCase())
        .eq("limit_type", "email");

      if (error) throw error;

      toast.success(`Rate limit cleared for ${email}`);
      setEmail("");
      await loadRateLimits();
    } catch (error) {
      logger.error("Error clearing email rate limit:", error);
      toast.error("Failed to clear email rate limit");
    } finally {
      setIsLoading(false);
    }
  };

  const clearIpRateLimit = async () => {
    if (!ip) {
      toast.error("Please enter an IP address");
      return;
    }

    try {
      setIsLoading(true);
      const { error } = await supabase
        .from("rate_limits")
        .delete()
        .eq("identifier", ip)
        .eq("limit_type", "ip");

      if (error) throw error;

      toast.success(`Rate limit cleared for IP ${ip}`);
      setIp("");
      await loadRateLimits();
    } catch (error) {
      logger.error("Error clearing IP rate limit:", error);
      toast.error("Failed to clear IP rate limit");
    } finally {
      setIsLoading(false);
    }
  };

  const clearAllRateLimits = async () => {
    if (
      !confirm(
        "Are you sure you want to clear all rate limits? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      setIsLoading(true);
      const { error } = await supabase
        .from("rate_limits")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all

      if (error) throw error;

      toast.success("All rate limits cleared");
      await loadRateLimits();
    } catch (error) {
      logger.error("Error clearing all rate limits:", error);
      toast.error("Failed to clear all rate limits");
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    loadRateLimits();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Rate Limit Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Clear Email Rate Limit */}
          <div className="flex gap-2">
            <Input
              placeholder="Enter email address to clear"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={clearEmailRateLimit}
              disabled={isLoading || !email}
              variant="outline"
            >
              Clear Email Limit
            </Button>
          </div>

          {/* Clear IP Rate Limit */}
          <div className="flex gap-2">
            <Input
              placeholder="Enter IP address to clear"
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={clearIpRateLimit}
              disabled={isLoading || !ip}
              variant="outline"
            >
              Clear IP Limit
            </Button>
          </div>

          {/* Clear All */}
          <div className="flex gap-2">
            <Button
              onClick={clearAllRateLimits}
              disabled={isLoading}
              variant="destructive"
              className="flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Clear All Rate Limits
            </Button>
            <Button
              onClick={loadRateLimits}
              disabled={isLoading}
              variant="outline"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Rate Limits */}
      <Card>
        <CardHeader>
          <CardTitle>Current Rate Limits</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
            </div>
          ) : rateLimits.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No active rate limits
            </p>
          ) : (
            <div className="space-y-2">
              {rateLimits.map((limit) => (
                <div
                  key={limit.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        limit.limit_type === "email" ? "default" : "secondary"
                      }
                    >
                      {limit.limit_type}
                    </Badge>
                    <span className="font-mono text-sm">
                      {limit.identifier}
                    </span>
                    <span className="text-sm text-gray-500">
                      {limit.attempt_count} attempts
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(limit.window_start).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
