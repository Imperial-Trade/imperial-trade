import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  Zap,
  AlertTriangle,
  TrendingUp,
  ExternalLink,
} from "lucide-react";
import { format, isToday, parseISO } from "date-fns";
import {
  economicCalendarService,
  EconomicEvent,
} from "@/services/EconomicCalendarService";

interface EconomicCalendarWidgetProps {
  variant?: "compact" | "full";
  maxEvents?: number;
  showOnlyHighImpact?: boolean;
  className?: string;
}

export default function EconomicCalendarWidget({
  variant = "compact",
  maxEvents = 5,
  showOnlyHighImpact = false,
  className = "",
}: EconomicCalendarWidgetProps) {
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTodaysEvents();
  }, []);

  const loadTodaysEvents = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const today = new Date();
      const dateFrom = format(today, "yyyy-MM-dd");
      const dateTo = format(today, "yyyy-MM-dd");

      const eventsData = await economicCalendarService.getEconomicEvents({
        dateFrom,
        dateTo,
        currencies: ["USD", "EUR", "GBP", "JPY"],
        impacts: showOnlyHighImpact ? ["high"] : ["high", "medium", "low"],
      });

      const filteredEvents = eventsData
        .filter((event) => isToday(parseISO(event.date)))
        .slice(0, maxEvents);

      setEvents(filteredEvents);
    } catch (err) {
      logger.error("Failed to load economic events:", err);
      setError("Failed to load events");

      // Fallback to mock data for today - properly typed
      const mockEvents: EconomicEvent[] = [
        {
          id: "1",
          time: "08:30",
          currency: "USD",
          impact: "high" as const,
          event: "Non-Farm Payrolls",
          actual: "",
          forecast: "180K",
          previous: "150K",
          date: new Date().toISOString(),
          description:
            "Change in the number of employed people during the previous month.",
        },
        {
          id: "2",
          time: "10:00",
          currency: "USD",
          impact: "medium" as const,
          event: "Unemployment Rate",
          actual: "",
          forecast: "4.2%",
          previous: "4.2%",
          date: new Date().toISOString(),
          description: "Percentage of the total work force that is unemployed.",
        },
      ].slice(0, maxEvents);

      setEvents(mockEvents);
    } finally {
      setIsLoading(false);
    }
  };

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case "high":
        return <Zap className="w-3 h-3 text-red-500" />;
      case "medium":
        return <AlertTriangle className="w-3 h-3 text-yellow-500" />;
      case "low":
        return <TrendingUp className="w-3 h-3 text-green-500" />;
      default:
        return <Calendar className="w-3 h-3 text-gray-500" />;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "high":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      case "medium":
        return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
      case "low":
        return "bg-green-500/10 text-green-400 border-green-500/20";
      default:
        return "bg-gray-500/10 text-gray-400 border-gray-500/20";
    }
  };

  const getTimeUntilEvent = (eventTime: string) => {
    const now = new Date();
    const [hours, minutes] = eventTime.split(":").map(Number);
    const eventDate = new Date();
    eventDate.setHours(hours, minutes, 0, 0);

    const diff = eventDate.getTime() - now.getTime();
    const hoursUntil = Math.floor(diff / (1000 * 60 * 60));
    const minutesUntil = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (diff < 0) return "Past";
    if (hoursUntil === 0) return `${minutesUntil}m`;
    return `${hoursUntil}h ${minutesUntil}m`;
  };

  if (variant === "compact") {
    return (
      <Card className={`bg-surface/50 border-default ${className}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-400" />
              Today's Events
            </CardTitle>
            <Button variant="ghost" size="sm" asChild className="text-xs">
              <a href="/dashboard/advanced-tools">
                <ExternalLink className="w-3 h-3" />
              </a>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-400 border-t-transparent" />
            </div>
          ) : events.length === 0 ? (
            <p className="text-secondary text-sm text-center py-2">
              No events today
            </p>
          ) : (
            events.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between p-2 bg-background/50 rounded-md"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Badge
                    className={`${getImpactColor(
                      event.impact
                    )} text-xs px-1 py-0 flex items-center gap-1`}
                  >
                    {getImpactIcon(event.impact)}
                    {event.currency}
                  </Badge>
                  <span className="text-sm text-primary truncate">
                    {event.event}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-secondary">
                  <Clock className="w-3 h-3" />
                  <span>{event.time}</span>
                  <span className="text-accent-green">
                    ({getTimeUntilEvent(event.time)})
                  </span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`bg-surface/50 border-default ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-400" />
            Economic Events Today
          </CardTitle>
          <Button variant="outline" size="sm" onClick={loadTodaysEvents}>
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-24">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-400 border-t-transparent" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-8 h-8 text-secondary/50 mx-auto mb-2" />
            <p className="text-secondary">
              No economic events scheduled for today
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="p-3 bg-background/50 rounded-lg border border-default/50"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge
                      className={`${getImpactColor(
                        event.impact
                      )} flex items-center gap-1`}
                    >
                      {getImpactIcon(event.impact)}
                      {event.impact.toUpperCase()}
                    </Badge>
                    <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                      {event.currency}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-secondary">
                    <Clock className="w-3 h-3" />
                    <span>{event.time}</span>
                    <span className="text-accent-green ml-1">
                      ({getTimeUntilEvent(event.time)})
                    </span>
                  </div>
                </div>
                <h4 className="font-medium text-primary mb-1">{event.event}</h4>
                <p className="text-xs text-secondary mb-2">
                  {event.description}
                </p>
                <div className="flex gap-4 text-xs">
                  <div>
                    <span className="text-secondary">Previous: </span>
                    <span className="text-primary">
                      {event.previous || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-secondary">Forecast: </span>
                    <span className="text-primary">
                      {event.forecast || "N/A"}
                    </span>
                  </div>
                  {event.actual && (
                    <div>
                      <span className="text-secondary">Actual: </span>
                      <span className="text-accent-green font-medium">
                        {event.actual}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
