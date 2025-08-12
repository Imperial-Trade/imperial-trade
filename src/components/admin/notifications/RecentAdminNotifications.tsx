
import React from 'react';
import { CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, Users, CheckCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';

type EventRow = {
  id: string;
  event_type: string;
  channels: string[];
  subject: string | null;
  message: string;
  delivery_status: string;
  sent_at: string;
  recipients: any;
};

const iconFor = (eventType: string) => {
  switch (eventType) {
    case 'new_request': return <Users className="w-4 h-4 text-blue-600 mt-0.5" />;
    case 'request_resubmitted': return <RefreshCw className="w-4 h-4 text-orange-600 mt-0.5" />;
    case 'test': return <Bell className="w-4 h-4 text-indigo-600 mt-0.5" />;
    default: return <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />;
  }
};

const pillForStatus = (status: string) => {
  switch (status) {
    case 'sent': return <Badge className="bg-green-100 text-green-700 border border-green-200">Sent</Badge>;
    case 'partial': return <Badge className="bg-yellow-100 text-yellow-700 border border-yellow-200">Partial</Badge>;
    case 'failed': return <Badge className="bg-red-100 text-red-700 border border-red-200">Failed</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
};

export const RecentAdminNotifications: React.FC = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-notification-events', 'recent'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_notification_events')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data || []) as EventRow[];
    },
    meta: {
      onError: (err: any) => console.error('RecentAdminNotifications error', err),
    },
  });

  if (isLoading) {
    return (
      <CardContent>
        <div className="space-y-3">
          <div className="h-16 rounded-md bg-muted animate-pulse" />
          <div className="h-16 rounded-md bg-muted animate-pulse" />
          <div className="h-16 rounded-md bg-muted animate-pulse" />
        </div>
      </CardContent>
    );
  }

  if (error) {
    return (
      <CardContent>
        <div className="text-sm text-destructive">Failed to load recent activity.</div>
      </CardContent>
    );
  }

  if (!data || data.length === 0) {
    return (
      <CardContent>
        <div className="text-sm text-muted-foreground">No recent notifications.</div>
      </CardContent>
    );
  }

  return (
    <CardContent>
      <div className="space-y-3">
        {data.map((row) => (
          <div key={row.id} className="flex items-start gap-3 p-3 rounded-lg border">
            {iconFor(row.event_type)}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">
                  {row.subject || row.event_type.replace(/_/g, ' ')}
                </p>
                {pillForStatus(row.delivery_status)}
              </div>
              <p className="text-xs text-muted-foreground">{row.message}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatDistanceToNow(new Date(row.sent_at), { addSuffix: true })} • Channels: {row.channels.join(', ') || 'none'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  );
};
