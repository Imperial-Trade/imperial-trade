import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { EconomicEvent } from "@/services/EconomicCalendarService";
import { toast } from "sonner";

interface EconomicRealtimeContextType {
  events: EconomicEvent[];
  connectionStatus: "connecting" | "connected" | "disconnected" | "error";
  lastUpdate: Date | null;
  upcomingEvents: EconomicEvent[];
  highImpactEvents: EconomicEvent[];
  subscribe: () => void;
  unsubscribe: () => void;
  addEventAlert: (eventId: string, minutesBefore: number) => void;
  removeEventAlert: (eventId: string) => void;
  getTimeUntilEvent: (event: EconomicEvent) => number;
}

const EconomicRealtimeContext =
  createContext<EconomicRealtimeContextType | null>(null);

export const useEconomicRealtime = () => {
  const context = useContext(EconomicRealtimeContext);
  if (!context) {
    throw new Error(
      "useEconomicRealtime must be used within EconomicRealtimeProvider"
    );
  }
  return context;
};

interface EconomicRealtimeProviderProps {
  children: React.ReactNode;
  enabled?: boolean;
  notificationsEnabled?: boolean;
}

export const EconomicRealtimeProvider: React.FC<
  EconomicRealtimeProviderProps
> = ({ children, enabled = true, notificationsEnabled = true }) => {
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected" | "error"
  >("disconnected");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [eventAlerts, setEventAlerts] = useState<Set<string>>(new Set());
  const [channel, setChannel] = useState<any>(null);

  // Calculate upcoming events (next 24 hours)
  const upcomingEvents = React.useMemo(() => {
    const now = new Date();
    const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    return events
      .filter((event) => {
        const eventDate = new Date(`${event.date} ${event.time}`);
        return eventDate >= now && eventDate <= next24Hours;
      })
      .sort((a, b) => {
        const dateA = new Date(`${a.date} ${a.time}`);
        const dateB = new Date(`${b.date} ${b.time}`);
        return dateA.getTime() - dateB.getTime();
      });
  }, [events]);

  // Filter high impact events
  const highImpactEvents = React.useMemo(() => {
    return events.filter((event) => event.impact === "high");
  }, [events]);

  // Calculate time until event in minutes
  const getTimeUntilEvent = useCallback((event: EconomicEvent): number => {
    const now = new Date();
    const eventDate = new Date(`${event.date} ${event.time}`);
    return Math.floor((eventDate.getTime() - now.getTime()) / (1000 * 60));
  }, []);

  // Subscribe to real-time updates
  const subscribe = useCallback(() => {
    if (!enabled || channel) return;

    logger.log("EconomicRealtime - Subscribing to economic_events updates");
    setConnectionStatus("connecting");

    const newChannel = supabase
      .channel("economic_events_realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "economic_events",
        },
        (payload) => {
          logger.log("EconomicRealtime - Database change:", payload);
          setLastUpdate(new Date());

          if (payload.eventType === "INSERT") {
            const newEvent = payload.new as EconomicEvent;
            setEvents((prev) => [...prev, newEvent]);

            // Show notification for high impact events
            if (notificationsEnabled && newEvent.impact === "high") {
              const timeUntil = Math.floor(
                (new Date(`${newEvent.date} ${newEvent.time}`).getTime() -
                  new Date().getTime()) /
                  (1000 * 60)
              );
              if (timeUntil > 0 && timeUntil <= 60) {
                toast.info(`📊 High Impact Event`, {
                  description: `${newEvent.event} (${newEvent.currency}) in ${timeUntil} minutes`,
                  duration: 10000,
                });
              }
            }
          } else if (payload.eventType === "UPDATE") {
            const updatedEvent = payload.new as EconomicEvent;
            setEvents((prev) =>
              prev.map((event) =>
                event.id === updatedEvent.id ? updatedEvent : event
              )
            );

            // Show notification for actual value updates
            if (
              notificationsEnabled &&
              updatedEvent.actual &&
              payload.old &&
              !payload.old.actual
            ) {
              toast.success(`📈 Event Result Updated`, {
                description: `${updatedEvent.event}: Actual ${updatedEvent.actual}`,
                duration: 8000,
              });
            }
          } else if (payload.eventType === "DELETE") {
            setEvents((prev) =>
              prev.filter((event) => event.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe((status) => {
        logger.log("EconomicRealtime - Subscription status:", status);
        if (status === "SUBSCRIBED") {
          setConnectionStatus("connected");
        } else if (status === "CHANNEL_ERROR") {
          setConnectionStatus("error");
        }
      });

    setChannel(newChannel);
  }, [enabled, notificationsEnabled, channel]);

  // Unsubscribe from real-time updates
  const unsubscribe = useCallback(() => {
    if (channel) {
      logger.log("EconomicRealtime - Unsubscribing from updates");
      supabase.removeChannel(channel);
      setChannel(null);
      setConnectionStatus("disconnected");
    }
  }, [channel]);

  // Add event alert
  const addEventAlert = useCallback(
    (eventId: string, minutesBefore: number) => {
      const alertKey = `${eventId}-${minutesBefore}`;
      setEventAlerts((prev) => new Set(prev).add(alertKey));
    },
    []
  );

  // Remove event alert
  const removeEventAlert = useCallback((eventId: string) => {
    setEventAlerts((prev) => {
      const newSet = new Set(prev);
      // Remove all alerts for this event
      Array.from(newSet).forEach((alert) => {
        if (alert.startsWith(eventId)) {
          newSet.delete(alert);
        }
      });
      return newSet;
    });
  }, []);

  // Check for event alerts
  useEffect(() => {
    if (!notificationsEnabled || upcomingEvents.length === 0) return;

    const checkAlerts = () => {
      upcomingEvents.forEach((event) => {
        const minutesUntil = getTimeUntilEvent(event);

        // Check for standard alert times: 60, 30, 15, 5 minutes
        [60, 30, 15, 5].forEach((alertTime) => {
          const alertKey = `${event.id}-${alertTime}`;

          if (
            minutesUntil <= alertTime &&
            minutesUntil > alertTime - 2 &&
            !eventAlerts.has(alertKey)
          ) {
            // Add to alerts to prevent duplicate notifications
            setEventAlerts((prev) => new Set(prev).add(alertKey));

            // Show browser notification if permission granted
            if (
              "Notification" in window &&
              Notification.permission === "granted"
            ) {
              new Notification(`📊 Economic Event Alert`, {
                body: `${event.event} (${event.currency}) in ${minutesUntil} minutes`,
                icon: "/favicon.ico",
                tag: alertKey,
              });
            }

            // Show in-app notification
            const impactIcon =
              event.impact === "high"
                ? "🔥"
                : event.impact === "medium"
                ? "⚠️"
                : "ℹ️";
            toast.info(`${impactIcon} Economic Event Alert`, {
              description: `${event.event} (${event.currency}) starting in ${minutesUntil} minutes`,
              duration: minutesUntil <= 5 ? 15000 : 10000,
            });
          }
        });
      });
    };

    // Check immediately and then every minute
    checkAlerts();
    const interval = setInterval(checkAlerts, 60 * 1000);

    return () => clearInterval(interval);
  }, [upcomingEvents, getTimeUntilEvent, eventAlerts, notificationsEnabled]);

  // Request notification permission on mount
  useEffect(() => {
    if (
      notificationsEnabled &&
      "Notification" in window &&
      Notification.permission === "default"
    ) {
      Notification.requestPermission();
    }
  }, [notificationsEnabled]);

  // Auto-subscribe on mount if enabled
  useEffect(() => {
    if (enabled) {
      subscribe();
    }

    return () => {
      unsubscribe();
    };
  }, [enabled, subscribe, unsubscribe]);

  const contextValue: EconomicRealtimeContextType = {
    events,
    connectionStatus,
    lastUpdate,
    upcomingEvents,
    highImpactEvents,
    subscribe,
    unsubscribe,
    addEventAlert,
    removeEventAlert,
    getTimeUntilEvent,
  };

  return (
    <EconomicRealtimeContext.Provider value={contextValue}>
      {children}
    </EconomicRealtimeContext.Provider>
  );
};
