
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Clock, 
  Users, 
  Video, 
  ExternalLink,
  Play,
  Pause,
  User
} from 'lucide-react';
import { format } from 'date-fns';

interface LiveSession {
  id: string;
  session_title: string;
  description: string;
  session_date: string;
  host_name: string;
  zoom_meeting_url: string;
  zoom_meeting_id: string;
  zoom_passcode: string;
  status: 'scheduled' | 'live' | 'completed';
  auto_start_enabled: boolean;
}

export default function Live() {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUser();
    fetchLiveSessions();
  }, []);

  const fetchUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const fetchLiveSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('live_sessions')
        .select('*')
        .order('session_date', { ascending: true });

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error fetching live sessions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'live':
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30 animate-pulse">
            <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
            LIVE
          </Badge>
        );
      case 'scheduled':
        return (
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
            <Clock className="w-3 h-3 mr-1" />
            Scheduled
          </Badge>
        );
      case 'completed':
        return (
          <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">
            Completed
          </Badge>
        );
      default:
        return null;
    }
  };

  const joinSession = (session: LiveSession) => {
    window.open(session.zoom_meeting_url, '_blank');
  };

  if (isLoading) {
    return (
      <div className="min-h-full flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-green"></div>
      </div>
    );
  }

  const liveSessions = sessions.filter(s => s.status === 'live');
  const upcomingSessions = sessions.filter(s => s.status === 'scheduled');
  const completedSessions = sessions.filter(s => s.status === 'completed').slice(0, 5);

  return (
    <div className="min-h-full bg-background p-6 w-full">
      <div className="w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-primary mb-2">
            Live <span className="gold-text-gradient">Trading Sessions</span>
          </h1>
          <p className="text-secondary text-lg">
            Join interactive trading sessions with professional educators and fellow traders.
          </p>
        </div>

        {/* Live Sessions */}
        {liveSessions.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-primary mb-6 flex items-center gap-3">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              Live Now
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {liveSessions.map((session) => (
                <Card key={session.id} className="glass-effect border-red-500/30 bg-red-500/5">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2">{session.session_title}</CardTitle>
                        <div className="flex items-center gap-2 text-sm text-secondary mb-2">
                          <User className="w-4 h-4" />
                          {session.host_name}
                        </div>
                      </div>
                      {getStatusBadge(session.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-secondary text-sm mb-4">
                      {session.description || 'Live trading session in progress'}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-secondary">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(session.session_date), 'MMM dd, yyyy')}
                      </div>
                      <Button 
                        onClick={() => joinSession(session)}
                        className="bg-red-500 hover:bg-red-600 text-white"
                      >
                        <Video className="w-4 h-4 mr-2" />
                        Join Live
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Sessions */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-primary mb-6 flex items-center gap-3">
            <Clock className="w-6 h-6 text-accent-blue" />
            Upcoming Sessions
          </h2>
          {upcomingSessions.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
              {upcomingSessions.map((session) => (
                <Card key={session.id} className="glass-effect hover:border-accent-blue/50 transition-all">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2">{session.session_title}</CardTitle>
                        <div className="flex items-center gap-2 text-sm text-secondary mb-2">
                          <User className="w-4 h-4" />
                          {session.host_name}
                        </div>
                      </div>
                      {getStatusBadge(session.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-secondary text-sm mb-4">
                      {session.description || 'Join us for an interactive trading session'}
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-accent-blue" />
                        <span>{format(new Date(session.session_date), 'EEEE, MMM dd, yyyy')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-accent-blue" />
                        <span>{format(new Date(session.session_date), 'h:mm a')}</span>
                      </div>
                      {session.zoom_meeting_id && (
                        <div className="text-xs text-secondary">
                          Meeting ID: {session.zoom_meeting_id}
                        </div>
                      )}
                    </div>
                    <Button 
                      onClick={() => joinSession(session)}
                      variant="outline"
                      className="w-full mt-4"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Join Session
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="glass-effect">
              <CardContent className="py-12 text-center">
                <Calendar className="w-16 h-16 text-secondary mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-semibold text-primary mb-2">No Upcoming Sessions</h3>
                <p className="text-secondary">
                  New live trading sessions will be scheduled soon. Check back for updates!
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Recent Sessions */}
        {completedSessions.length > 0 && (
          <div>
            <h2 className="text-2xl font-semibold text-secondary mb-6 flex items-center gap-3">
              <Play className="w-6 h-6" />
              Recent Sessions
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
              {completedSessions.map((session) => (
                <Card key={session.id} className="glass-effect opacity-75">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2">{session.session_title}</CardTitle>
                        <div className="flex items-center gap-2 text-sm text-secondary mb-2">
                          <User className="w-4 h-4" />
                          {session.host_name}
                        </div>
                      </div>
                      {getStatusBadge(session.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-secondary">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(session.session_date), 'MMM dd, yyyy')}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
