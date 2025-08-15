
import React, { useState, useEffect } from 'react';
import { economicCalendarService, EconomicEvent } from '@/services/EconomicCalendarService';
import { format, parseISO, differenceInMinutes, isToday } from 'date-fns';

interface EconomicNotificationSystemProps {
  enabled?: boolean;
  notifyMinutesBefore?: number[];
  highImpactOnly?: boolean;
}

export default function EconomicNotificationSystem({ 
  enabled = true,
  notifyMinutesBefore = [15, 60],
  highImpactOnly = true
}: EconomicNotificationSystemProps) {
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [notifiedEvents, setNotifiedEvents] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled) return;

    const loadTodaysEvents = async () => {
      try {
        const today = new Date();
        const dateFrom = format(today, 'yyyy-MM-dd');
        const dateTo = format(today, 'yyyy-MM-dd');
        
        const eventsData = await economicCalendarService.getEconomicEvents({
          dateFrom,
          dateTo,
          currencies: ['USD', 'EUR', 'GBP', 'JPY'],
          impacts: highImpactOnly ? ['high'] : ['high', 'medium', 'low']
        });
        
        const todaysEvents = eventsData.filter(event => isToday(parseISO(event.date)));
        setEvents(todaysEvents);
      } catch (err) {
        console.error('Failed to load events for notifications:', err);
      }
    };

    loadTodaysEvents();
    const interval = setInterval(loadTodaysEvents, 5 * 60 * 1000); // Refresh every 5 minutes

    return () => clearInterval(interval);
  }, [enabled, highImpactOnly]);

  useEffect(() => {
    if (!enabled || events.length === 0) return;

    const checkNotifications = () => {
      const now = new Date();
      
      events.forEach(event => {
        const [hours, minutes] = event.time.split(':').map(Number);
        const eventDateTime = new Date();
        eventDateTime.setHours(hours, minutes, 0, 0);
        
        const minutesUntilEvent = differenceInMinutes(eventDateTime, now);
        
        notifyMinutesBefore.forEach(notifyBefore => {
          const notificationId = `${event.id}-${notifyBefore}`;
          
          if (minutesUntilEvent <= notifyBefore && 
              minutesUntilEvent > (notifyBefore - 5) && 
              !notifiedEvents.has(notificationId)) {
            
            // Browser notification
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(`Economic Event Alert`, {
                body: `${event.event} (${event.currency}) in ${minutesUntilEvent} minutes`,
                icon: '/favicon.ico',
                tag: notificationId
              });
            }
            
            // In-app notification
            if ((window as any).addNotification) {
              (window as any).addNotification({
                type: 'new_signal',
                title: `📊 Economic Event Alert`,
                message: `${event.event} (${event.currency}) starting in ${minutesUntilEvent} minutes`
              });
            }
            
            setNotifiedEvents(prev => new Set(prev).add(notificationId));
          }
        });
      });
    };

    // Check immediately and then every minute
    checkNotifications();
    const interval = setInterval(checkNotifications, 60 * 1000);

    return () => clearInterval(interval);
  }, [events, enabled, notifyMinutesBefore, notifiedEvents]);

  // Note: Notification permission is handled by OneSignal native slidedown
  // Don't request permission here to avoid competing with OneSignal prompt

  return null; // This component doesn't render anything
}
