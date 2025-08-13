import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AccountRequest } from "@/api/entities";

export const useRealTimeRequests = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [newRequestCount, setNewRequestCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      const data = await AccountRequest.list();
      setRequests(data);
    } catch (error) {
      logger.error("Error loading requests:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();

    // Set up real-time subscription
    const channel = supabase
      .channel("account_requests_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "account_requests",
        },
        (payload) => {
          logger.log("Real-time update:", payload);

          if (payload.eventType === "INSERT") {
            setNewRequestCount((prev) => prev + 1);
            setRequests((prev) => [payload.new, ...prev]);

            // Notifications are handled centrally on create; avoid duplicates here
          } else if (payload.eventType === "UPDATE") {
            setRequests((prev) =>
              prev.map((req) => (req.id === payload.new.id ? payload.new : req))
            );

            // Check if it's a resubmission
            // Resubmission notifications handled centrally; avoid duplicates here
          } else if (payload.eventType === "DELETE") {
            setRequests((prev) =>
              prev.filter((req) => req.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadRequests]);

  const clearNewRequestCount = useCallback(() => {
    setNewRequestCount(0);
  }, []);

  return {
    requests,
    newRequestCount,
    loading,
    loadRequests,
    clearNewRequestCount,
  };
};
