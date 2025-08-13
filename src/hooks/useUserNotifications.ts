import { useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { z } from "zod";
import {
  UserNotificationSchema,
  type UserNotification,
} from "@/schemas/notifications";

const listSchema = z.array(UserNotificationSchema);

export const useUserNotifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id || null;

  const { data, isLoading, error } = useQuery({
    queryKey: ["user_notifications", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      const parsed = listSchema.parse(data ?? []);
      return parsed;
    },
    staleTime: 30_000,
  });

  const unreadCount = useMemo(
    () => data?.filter((n) => !n.is_read).length ?? 0,
    [data]
  );

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("user_notifications")
        .update({ is_read: true })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["user_notifications", userId],
      });
    },
    meta: {
      onErrorMessage: "Failed to mark notification as read",
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!userId) return;
      const { error } = await supabase
        .from("user_notifications")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("is_read", false);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["user_notifications", userId],
      });
    },
    meta: {
      onErrorMessage: "Failed to mark all notifications as read",
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("user_notifications")
        .delete()
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["user_notifications", userId],
      });
    },
    meta: {
      onErrorMessage: "Failed to delete notification",
    },
  });

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`user-notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          logger.log("🔔 user_notifications change:", payload);
          queryClient.invalidateQueries({
            queryKey: ["user_notifications", userId],
          });
        }
      )
      .subscribe((status) => {
        logger.log("📡 user_notifications realtime status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  return {
    notifications: (data ?? []) as UserNotification[],
    isLoading,
    error,
    unreadCount,
    markAsRead: (id: string) => markAsReadMutation.mutate(id),
    markAllAsRead: () => markAllAsReadMutation.mutate(),
    deleteNotification: (id: string) => deleteMutation.mutate(id),
  };
};
