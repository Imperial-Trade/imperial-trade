import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Loader2, Calendar, Clock, User, Video, ExternalLink, Settings, Zap, MonitorPlay } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLiveSessionManager, LiveSession } from '@/hooks/useLiveSessionManager';
import { CreateSessionDialog } from '@/components/live/CreateSessionDialog';
import { EditSessionDialog } from '@/components/live/EditSessionDialog';
import { SessionStatusControls } from '@/components/live/SessionStatusControls';
import { VideoPlayer } from '@/components/live/VideoPlayer';
import { ZoomSDKPlayer } from '@/components/live/ZoomSDKPlayer';

export default function Live() {
  const { user, profile } = useAuth();
  const {
    sessions,
    loading: isLoading,
    creating,
    updating,
    canManageSessions,
    createSession,
    updateSession,
    updateSessionStatus,
    deleteSession
  } = useLiveSessionManager();
  
  const [editingSession, setEditingSession] = useState<LiveSession | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [watchingSession, setWatchingSession] = useState<LiveSession | null>(null);
  const [sdkSession, setSdkSession] = useState<LiveSession | null>(null);

  const handleEditSession = (session: LiveSession) => {
    setEditingSession(session);
    setEditDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'live':
        return (
          <Badge className="bg-red-500 text-white">
            <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
            LIVE
          </Badge>
        );
      case 'scheduled':
        return (
          <Badge className="bg-blue-500 text-white">
            <Calendar className="w-3 h-3 mr-1" />
            Scheduled
          </Badge>
        );
      case 'completed':
        return (
          <Badge className="bg-gray-500 text-white">
            Completed
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const formatSessionDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  };

  const joinSession = (session: LiveSession) => {
    window.open(session.zoom_meeting_url, '_blank');
  };

  const joinSessionWithSDK = (session: LiveSession) => {
    if (session.zoom_sdk_enabled && session.zoom_meeting_number) {
      setSdkSession(session);
    } else {
      joinSession(session);
    }
  };

  const watchLiveSession = (session: LiveSession) => {
    if (session.stream_embed_url) {
      setWatchingSession(session);
    } else {
      // Fallback to Zoom for regular users if no embed URL
      joinSession(session);
    }
  };

  const canUseSDK = (session: LiveSession) => {
    return session.zoom_sdk_enabled && session.zoom_meeting_number && canManageSessions;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-muted-foreground">Loading live sessions...</p>
        </div>
      </div>
    );
  }

  // Filter sessions by status
  const liveSessions = sessions.filter(session => session.status === 'live');
  const upcomingSessions = sessions.filter(session => session.status === 'scheduled');
  const recentSessions = sessions.filter(session => session.status === 'completed').slice(0, 5);

  return (
    <TooltipProvider>
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div className="animate-fade-in-up">
                <h1 className="text-4xl font-bold mb-3">
                  <span className="imperial-gradient-text">Live Trading Sessions</span>
                </h1>
                <p className="text-lg text-muted-foreground">
                  Join live trading sessions with expert traders and educators
                </p>
              </div>
              
              {/* Management Controls for Admins/Educators */}
              {canManageSessions && (
                <div className="flex items-center gap-4">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center text-sm text-muted-foreground glass-effect px-3 py-2 rounded-lg">
                        <Settings className="w-4 h-4 mr-2" />
                        Session Manager
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      You can create and manage live trading sessions
                    </TooltipContent>
                  </Tooltip>
                  <CreateSessionDialog 
                    onCreateSession={createSession}
                    creating={creating}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Live Sessions */}
          {liveSessions.length > 0 && (
            <div className="mb-10">
              <h2 className="text-3xl font-bold mb-6 flex items-center">
                <div className="w-4 h-4 bg-red-500 rounded-full mr-4 animate-pulse shadow-lg"></div>
                <span className="imperial-gradient-text">Currently Live</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {liveSessions.map((session) => (
                  <Card key={session.id} className="glass-effect border-0 shadow-2xl hover:shadow-3xl transition-all duration-300 animate-scale-in">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg text-primary mb-2">{session.session_title}</CardTitle>
                          <CardDescription className="text-muted-foreground">
                            {session.description}
                          </CardDescription>
                        </div>
                         <div className="flex flex-col items-end gap-2">
                           {getStatusBadge(session.status)}
                           <div className="flex items-center gap-1">
                             {session.auto_start_enabled && (
                               <Tooltip>
                                 <TooltipTrigger asChild>
                                   <Zap className="w-4 h-4 text-yellow-500" />
                                 </TooltipTrigger>
                                 <TooltipContent>Auto-start enabled</TooltipContent>
                               </Tooltip>
                             )}
                             {canUseSDK(session) && (
                               <Tooltip>
                                 <TooltipTrigger asChild>
                                   <MonitorPlay className="w-4 h-4 text-green-500" />
                                 </TooltipTrigger>
                                 <TooltipContent>In-app viewing available</TooltipContent>
                               </Tooltip>
                             )}
                           </div>
                         </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <User className="w-4 h-4 mr-2" />
                          <span>Host: {session.host_name}</span>
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Clock className="w-4 h-4 mr-2" />
                          <span>{formatSessionDate(session.session_date)}</span>
                        </div>
                        {session.zoom_meeting_id && (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Video className="w-4 h-4 mr-2" />
                            <span>Meeting ID: {session.zoom_meeting_id}</span>
                          </div>
                        )}
                        
                         <div className="pt-2">
                           {canManageSessions ? (
                             <>
                               {canUseSDK(session) ? (
                                 <Button 
                                   onClick={() => joinSessionWithSDK(session)} 
                                   className="w-full bg-green-500 hover:bg-green-600 text-white mb-2"
                                 >
                                   <MonitorPlay className="w-4 h-4 mr-2" />
                                   Join in App
                                 </Button>
                               ) : (
                                 <Button 
                                   onClick={() => joinSession(session)} 
                                   className="w-full bg-red-500 hover:bg-red-600 text-white mb-2"
                                 >
                                   <ExternalLink className="w-4 h-4 mr-2" />
                                   Join Zoom Session
                                 </Button>
                               )}
                               {canUseSDK(session) && (
                                 <Button 
                                   onClick={() => joinSession(session)} 
                                   variant="outline"
                                   className="w-full mb-3"
                                 >
                                   <ExternalLink className="w-4 h-4 mr-2" />
                                   Join Externally
                                 </Button>
                               )}
                             </>
                           ) : (
                             <Button 
                               onClick={() => watchLiveSession(session)} 
                               className="w-full bg-red-500 hover:bg-red-600 text-white mb-3"
                             >
                               <Video className="w-4 h-4 mr-2" />
                               {session.stream_embed_url ? 'Watch Live' : 'Join Session'}
                             </Button>
                           )}
                          
                          {/* Management Controls for Admins/Educators */}
                          {canManageSessions && (
                            <>
                              <Separator className="my-2" />
                              <SessionStatusControls
                                session={session}
                                onUpdateStatus={updateSessionStatus}
                                onDeleteSession={deleteSession}
                                onEditSession={handleEditSession}
                                updating={updating}
                              />
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Sessions */}
          <div className="mb-10">
            <h2 className="text-3xl font-bold mb-6 flex items-center">
              <div className="p-2 rounded-full bg-gradient-to-r from-blue-400/20 to-blue-600/20 mr-4">
                <Calendar className="w-6 h-6 text-blue-500" />
              </div>
              <span className="imperial-gradient-text">Upcoming Sessions</span>
            </h2>
            {upcomingSessions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {upcomingSessions.map((session) => (
                  <Card key={session.id} className="glass-effect border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg text-primary mb-2">{session.session_title}</CardTitle>
                          <CardDescription className="text-muted-foreground">
                            {session.description}
                          </CardDescription>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {getStatusBadge(session.status)}
                          {session.auto_start_enabled && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Zap className="w-4 h-4 text-yellow-500" />
                              </TooltipTrigger>
                              <TooltipContent>Auto-start enabled</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <User className="w-4 h-4 mr-2" />
                          <span>Host: {session.host_name}</span>
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Clock className="w-4 h-4 mr-2" />
                          <span>{formatSessionDate(session.session_date)}</span>
                        </div>
                        {session.zoom_meeting_id && (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Video className="w-4 h-4 mr-2" />
                            <span>Meeting ID: {session.zoom_meeting_id}</span>
                          </div>
                        )}
                        
                        <div className="pt-2">
                          {canManageSessions ? (
                            <Button 
                              onClick={() => joinSession(session)} 
                              className="w-full bg-primary hover:bg-primary/80 text-primary-foreground mb-3"
                              disabled={session.status !== 'live'}
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              {session.status === 'live' ? 'Join Zoom Session' : 'Session Not Started'}
                            </Button>
                          ) : (
                            <Button 
                              onClick={() => watchLiveSession(session)} 
                              className="w-full bg-primary hover:bg-primary/80 text-primary-foreground mb-3"
                              disabled={session.status !== 'live'}
                            >
                              <Video className="w-4 h-4 mr-2" />
                              {session.status === 'live' ? (session.stream_embed_url ? 'Watch Live' : 'Join Session') : 'Session Not Started'}
                            </Button>
                          )}
                          
                          {/* Management Controls for Admins/Educators */}
                          {canManageSessions && (
                            <>
                              <Separator className="my-2" />
                              <SessionStatusControls
                                session={session}
                                onUpdateStatus={updateSessionStatus}
                                onDeleteSession={deleteSession}
                                onEditSession={handleEditSession}
                                updating={updating}
                              />
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="glass-effect border-0">
                <CardContent className="text-center py-12">
                  <div className="p-4 rounded-full bg-gradient-to-r from-blue-400/20 to-blue-600/20 w-fit mx-auto mb-6">
                    <Calendar className="w-12 h-12 text-blue-500" />
                  </div>
                  <p className="text-lg text-muted-foreground mb-2">No upcoming sessions scheduled.</p>
                  {canManageSessions && (
                    <p className="text-sm text-muted-foreground">
                      Create your first session using the button above.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Recent Sessions */}
          <div>
            <h2 className="text-3xl font-bold mb-6 flex items-center">
              <div className="p-2 rounded-full bg-gradient-to-r from-gray-400/20 to-gray-600/20 mr-4">
                <Clock className="w-6 h-6 text-gray-500" />
              </div>
              <span className="imperial-gradient-text">Recent Sessions</span>
            </h2>
            {recentSessions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {recentSessions.map((session) => (
                  <Card key={session.id} className="glass-effect border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg text-primary mb-2">{session.session_title}</CardTitle>
                          <CardDescription className="text-muted-foreground">
                            {session.description}
                          </CardDescription>
                        </div>
                        {getStatusBadge(session.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <User className="w-4 h-4 mr-2" />
                          <span>Host: {session.host_name}</span>
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Clock className="w-4 h-4 mr-2" />
                          <span>{formatSessionDate(session.session_date)}</span>
                        </div>
                        
                        <div className="pt-2">
                          <Button 
                            variant="outline"
                            className="w-full mb-3"
                            disabled
                          >
                            Session Completed
                          </Button>
                          
                          {/* Management Controls for Admins/Educators */}
                          {canManageSessions && (
                            <>
                              <Separator className="my-2" />
                              <SessionStatusControls
                                session={session}
                                onUpdateStatus={updateSessionStatus}
                                onDeleteSession={deleteSession}
                                onEditSession={handleEditSession}
                                updating={updating}
                              />
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-card border-default">
                <CardContent className="text-center py-8">
                  <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No recent sessions available.</p>
                </CardContent>
              </Card>
            )}
          </div>
          
          {/* Edit Session Dialog */}
          <EditSessionDialog
            session={editingSession}
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            onUpdateSession={updateSession}
            updating={updating}
          />

          {/* Video Player Modal */}
          {watchingSession && watchingSession.stream_embed_url && (
            <VideoPlayer
              embedUrl={watchingSession.stream_embed_url}
              sessionTitle={watchingSession.session_title}
              onClose={() => setWatchingSession(null)}
            />
          )}

          {/* Zoom SDK Player Modal */}
          {sdkSession && (
            <ZoomSDKPlayer
              sessionId={sdkSession.id}
              meetingNumber={sdkSession.zoom_meeting_number!}
              sessionTitle={sdkSession.session_title}
              zoomMeetingUrl={sdkSession.zoom_meeting_url}
              onClose={() => setSdkSession(null)}
            />
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}