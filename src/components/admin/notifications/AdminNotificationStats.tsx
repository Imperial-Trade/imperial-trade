
import React, { useMemo } from 'react';
import { CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { subDays, startOfDay } from 'date-fns';

type EventRow = {
  id: string;
  delivery_status: string;
  channels: string[];
  sent_at: string;
};

const iso = (d: Date) => d.toISOString();

export const AdminNotificationStats: React.FC = () => {
  const todayStart = useMemo(() => startOfDay(new Date()), []);
  const weekStart = useMemo(() => subDays(startOfDay(new Date()), 7), []);

  const todayEmailsQuery = useQuery({
    queryKey: ['admin-stats', 'emails-today'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('admin_notification_events')
        .select('id,channels,sent_at', { count: 'exact', head: true })
        .gte('sent_at', iso(todayStart))
        .contains('channels', ['email']);
      if (error) throw error;
      return count || 0;
    },
    meta: {
      onError: (err: any) => console.error('emails-today error', err),
    },
  });

  const weekTotalQuery = useQuery({
    queryKey: ['admin-stats', 'total-week'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_notification_events')
        .select('id,delivery_status,sent_at')
        .gte('sent_at', iso(weekStart));
      if (error) throw error;
      return (data || []) as EventRow[];
    },
    meta: {
      onError: (err: any) => console.error('total-week error', err),
    },
  });

  const activeAdminsQuery = useQuery({
    queryKey: ['admin-stats', 'active-admins'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-notification-active-admins');
      if (error) throw error;
      return (data as any)?.count ?? 0;
    },
    meta: {
      onError: (err: any) => console.error('active-admins error', err),
    },
  });

  const relevant = (weekTotalQuery.data || []).filter(e => e.delivery_status !== 'skipped');
  const weekTotal = relevant.length;
  const weekSent = relevant.filter(e => e.delivery_status === 'sent').length;
  const deliveryRate = weekTotal > 0 ? Math.round((weekSent / weekTotal) * 100) : 0;

  return (
    <CardContent>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="text-center p-4 rounded-lg border">
          <div className="text-2xl font-bold">{todayEmailsQuery.data ?? 0}</div>
          <div className="text-sm text-muted-foreground">Emails sent today</div>
        </div>
        <div className="text-center p-4 rounded-lg border">
          <div className="text-2xl font-bold">{weekTotal}</div>
          <div className="text-sm text-muted-foreground">This week (all channels)</div>
        </div>
        <div className="text-center p-4 rounded-lg border">
          <div className="text-2xl font-bold">{deliveryRate}%</div>
          <div className="text-sm text-muted-foreground">Delivery rate (7d)</div>
        </div>
        <div className="text-center p-4 rounded-lg border">
          <div className="text-2xl font-bold">{activeAdminsQuery.data ?? 0}</div>
          <div className="text-sm text-muted-foreground">Active admin subscriptions</div>
        </div>
      </div>
    </CardContent>
  );
};
