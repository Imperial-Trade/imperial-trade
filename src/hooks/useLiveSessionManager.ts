import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { CreateLiveSessionData, UpdateLiveSessionData, StatusUpdateData } from '@/lib/validations/liveSessionSchema';

export interface LiveSession {
  id: string;
  session_title: string;
  description: string | null;
  session_date: string;
  host_name: string;
  zoom_meeting_url: string;
  zoom_meeting_id: string | null;
  zoom_passcode: string | null;
  stream_embed_url?: string;
  status: 'scheduled' | 'live' | 'completed';
  auto_start_enabled: boolean;
  zoom_sdk_enabled: boolean;
  zoom_meeting_number: string | null;
  created_at: string;
  updated_at: string;
}

export const useLiveSessionManager = () => {
  const { user, profile } = useAuth();
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  // Check if user can manage sessions
  const canManageSessions = useCallback(() => {
    return profile?.access_level === 'admin' || 
           profile?.user_type === 'educator' || 
           profile?.access_level === 'moderator';
  }, [profile]);

  // Fetch all sessions
  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('live_sessions')
        .select('*')
        .order('session_date', { ascending: true });

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast.error('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, []);

  // Helper function to check if session already exists
  const sessionExists = useCallback((sessionId: string, sessionsList: LiveSession[]) => {
    return sessionsList.some(session => session.id === sessionId);
  }, []);

  // Create new session
  const createSession = useCallback(async (sessionData: CreateLiveSessionData) => {
    if (!canManageSessions()) {
      toast.error('You do not have permission to create sessions');
      return false;
    }

    try {
      setCreating(true);
      const { data, error } = await supabase
        .from('live_sessions')
        .insert({
          session_title: sessionData.session_title,
          description: sessionData.description,
          host_name: sessionData.host_name,
          zoom_meeting_url: sessionData.zoom_meeting_url,
          zoom_meeting_id: sessionData.zoom_meeting_id,
          zoom_passcode: sessionData.zoom_passcode,
          session_date: sessionData.session_date,
          auto_start_enabled: sessionData.auto_start_enabled,
          stream_embed_url: sessionData.stream_embed_url,
          zoom_sdk_enabled: sessionData.zoom_sdk_enabled,
          zoom_meeting_number: sessionData.zoom_meeting_number,
          status: 'scheduled'
        })
        .select()
        .single();

      if (error) throw error;

      // Don't manually update state - let real-time subscription handle it
      toast.success('Live session created successfully');
      return true;
    } catch (error) {
      console.error('Error creating session:', error);
      toast.error('Failed to create session');
      return false;
    } finally {
      setCreating(false);
    }
  }, [canManageSessions]);

  // Update session
  const updateSession = useCallback(async (sessionId: string, updates: UpdateLiveSessionData) => {
    if (!canManageSessions()) {
      toast.error('You do not have permission to update sessions');
      return false;
    }

    try {
      setUpdating(sessionId);
      const { data, error } = await supabase
        .from('live_sessions')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;

      setSessions(prev => prev.map(session => 
        session.id === sessionId ? data : session
      ).sort((a, b) => 
        new Date(a.session_date).getTime() - new Date(b.session_date).getTime()
      ));
      
      toast.success('Session updated successfully');
      return true;
    } catch (error) {
      console.error('Error updating session:', error);
      toast.error('Failed to update session');
      return false;
    } finally {
      setUpdating(null);
    }
  }, [canManageSessions]);

  // Update session status
  const updateSessionStatus = useCallback(async (sessionId: string, status: StatusUpdateData['status']) => {
    if (!canManageSessions()) {
      toast.error('You do not have permission to change session status');
      return false;
    }

    try {
      setUpdating(sessionId);
      const { data, error } = await supabase
        .from('live_sessions')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;

      setSessions(prev => prev.map(session => 
        session.id === sessionId ? data : session
      ));
      
      const statusMessages = {
        'live': 'Session is now live!',
        'completed': 'Session marked as completed',
        'scheduled': 'Session rescheduled'
      };
      
      toast.success(statusMessages[status]);
      return true;
    } catch (error) {
      console.error('Error updating session status:', error);
      toast.error('Failed to update session status');
      return false;
    } finally {
      setUpdating(null);
    }
  }, [canManageSessions]);

  // Delete session
  const deleteSession = useCallback(async (sessionId: string) => {
    if (!canManageSessions()) {
      toast.error('You do not have permission to delete sessions');
      return false;
    }

    try {
      const { error } = await supabase
        .from('live_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      setSessions(prev => prev.filter(session => session.id !== sessionId));
      toast.success('Session deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting session:', error);
      toast.error('Failed to delete session');
      return false;
    }
  }, [canManageSessions]);

  // Set up real-time subscription
  useEffect(() => {
    const channelId = `live-sessions-${Date.now()}`;
    console.log(`WS-SESSIONS: SUBSCRIBE [${channelId}]`);
    
    const channel = supabase
      .channel('live-sessions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_sessions'
        },
        (payload) => {
          console.log('Live session change detected:', payload);
          
          if (payload.eventType === 'INSERT') {
            setSessions(prev => {
              const newSession = payload.new as LiveSession;
              // Check if session already exists to prevent duplicates
              if (sessionExists(newSession.id, prev)) {
                console.log('Session already exists, skipping duplicate:', newSession.id);
                return prev;
              }
              return [...prev, newSession].sort((a, b) => 
                new Date(a.session_date).getTime() - new Date(b.session_date).getTime()
              );
            });
          } else if (payload.eventType === 'UPDATE') {
            setSessions(prev => prev.map(session => 
              session.id === payload.new.id ? payload.new as LiveSession : session
            ));
          } else if (payload.eventType === 'DELETE') {
            setSessions(prev => prev.filter(session => session.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      console.log(`WS-SESSIONS: UNSUBSCRIBE [${channelId}]`);
      supabase.removeChannel(channel);
    };
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return {
    sessions,
    loading,
    creating,
    updating,
    canManageSessions: canManageSessions(),
    createSession,
    updateSession,
    updateSessionStatus,
    deleteSession,
    refreshSessions: fetchSessions
  };
};