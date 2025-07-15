import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Loader2, Calendar, Clock, User, Video, ExternalLink, Settings, 
  Zap, MonitorPlay, Search, Filter, Eye, Users, MessageCircle,
  ThumbsUp, Share2, Bell, PlayCircle, Mic, MicOff, Camera,
  CameraOff, Volume2, VolumeX, Heart, Send, MoreVertical
} from 'lucide-react';
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
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [chatMessage, setChatMessage] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleEditSession = (session: LiveSession) => {
    setEditingSession(session);
    setEditDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'live':
        return (
          <Badge className="bg-red-500 text-white animate-pulse">
            <div className="w-2 h-2 bg-white rounded-full mr-2 animate-ping"></div>
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
      joinSession(session);
    }
  };

  const canUseSDK = (session: LiveSession) => {
    return session.zoom_sdk_enabled && session.zoom_meeting_number && canManageSessions;
  };

  const mockChatMessages = [
    { id: 1, user: "TradingMaster", message: "Great analysis on the EUR/USD setup!", time: "2 min ago", avatar: "/avatars/1.jpg" },
    { id: 2, user: "ForexPro", message: "When do you think we'll see the breakout?", time: "1 min ago", avatar: "/avatars/2.jpg" },
    { id: 3, user: "CryptoKing", message: "Thanks for the insights! 📈", time: "30s ago", avatar: "/avatars/3.jpg" },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-red-500/5 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-red-500/30 border-t-red-500 rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading live sessions...</p>
        </div>
      </div>
    );
  }

  const liveSessions = sessions.filter(session => session.status === 'live');
  const upcomingSessions = sessions.filter(session => session.status === 'scheduled');
  const recentSessions = sessions.filter(session => session.status === 'completed').slice(0, 5);

  const filteredSessions = sessions.filter(session => {
    const matchesSearch = session.session_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         session.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         session.host_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || 
                           (selectedCategory === "live" && session.status === "live") ||
                           (selectedCategory === "upcoming" && session.status === "scheduled");
    return matchesSearch && matchesCategory;
  });

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-red-500/5">
        {/* YouTube-style Header */}
        <div className="border-b border-border/50 bg-background/95 backdrop-blur-xl">
          <div className="px-6 py-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center">
                    <PlayCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-foreground">Live Trading Sessions</h1>
                    <p className="text-muted-foreground">Learn from the best traders in real-time</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                {!isSubscribed ? (
                  <Button 
                    onClick={() => setIsSubscribed(true)}
                    className="bg-red-500 hover:bg-red-600 text-white px-6"
                  >
                    <Bell className="w-4 h-4 mr-2" />
                    Subscribe
                  </Button>
                ) : (
                  <Button variant="outline" className="border-red-500 text-red-500">
                    <Bell className="w-4 h-4 mr-2 fill-current" />
                    Subscribed
                  </Button>
                )}
                
                {canManageSessions && (
                  <CreateSessionDialog 
                    onCreateSession={createSession}
                    creating={creating}
                  />
                )}
              </div>
            </div>

            {/* Search and Filters */}
            <div className="mt-6 flex flex-col md:flex-row gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search sessions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-background/50 border-border/50"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                {[
                  { id: "all", name: "All", count: sessions.length },
                  { id: "live", name: "Live", count: liveSessions.length },
                  { id: "upcoming", name: "Upcoming", count: upcomingSessions.length }
                ].map((category) => (
                  <Button
                    key={category.id}
                    variant={selectedCategory === category.id ? "default" : "outline"}
                    onClick={() => setSelectedCategory(category.id)}
                    className="whitespace-nowrap"
                  >
                    {category.name}
                    {category.count > 0 && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {category.count}
                      </Badge>
                    )}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Live Now Section */}
          {liveSessions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <h2 className="text-2xl font-bold text-foreground">Live Now</h2>
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                  {liveSessions.length} Active
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {liveSessions.map((session, index) => (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <Card className="bg-gradient-to-br from-card/80 to-card/40 border-red-500/20 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden group">
                      {/* Video Thumbnail */}
                      <div className="aspect-video relative overflow-hidden bg-gradient-to-br from-red-500/20 to-red-600/20">
                        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                            <PlayCircle className="w-8 h-8 text-white" />
                          </div>
                        </div>
                        
                        {/* Live Badge */}
                        <div className="absolute top-4 left-4">
                          <Badge className="bg-red-500 text-white animate-pulse">
                            <div className="w-2 h-2 bg-white rounded-full mr-2 animate-ping"></div>
                            LIVE
                          </Badge>
                        </div>
                        
                        {/* Viewer Count */}
                        <div className="absolute top-4 right-4 bg-black/70 rounded-full px-3 py-1 flex items-center space-x-1 text-white text-sm">
                          <Eye className="w-3 h-3" />
                          <span>{Math.floor(Math.random() * 500) + 100}</span>
                        </div>
                        
                        {/* Duration */}
                        <div className="absolute bottom-4 right-4 bg-black/70 rounded px-2 py-1 text-white text-sm">
                          1:24:16
                        </div>
                      </div>
                      
                      <CardContent className="p-4 space-y-4">
                        {/* Title and Description */}
                        <div>
                          <h3 className="font-bold text-lg text-foreground line-clamp-2 group-hover:text-red-500 transition-colors">
                            {session.session_title}
                          </h3>
                          <p className="text-muted-foreground text-sm line-clamp-2 mt-1">
                            {session.description}
                          </p>
                        </div>
                        
                        {/* Channel Info */}
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="bg-red-500 text-white text-xs">
                              {session.host_name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium text-sm text-foreground">{session.host_name}</p>
                            <p className="text-xs text-muted-foreground">Trading Expert</p>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatSessionDate(session.session_date)}
                          </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex items-center space-x-2">
                          <Button 
                            onClick={() => watchLiveSession(session)}
                            className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                          >
                            <Video className="w-4 h-4 mr-2" />
                            Watch Live
                          </Button>
                          
                          <div className="flex items-center space-x-1">
                            <Button size="sm" variant="ghost" className="hover:bg-red-500/10">
                              <ThumbsUp className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="hover:bg-red-500/10">
                              <Share2 className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="hover:bg-red-500/10">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Upcoming Sessions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <div className="flex items-center space-x-3 mb-6">
              <Calendar className="w-6 h-6 text-blue-500" />
              <h2 className="text-2xl font-bold text-foreground">Upcoming Sessions</h2>
              {upcomingSessions.length > 0 && (
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                  {upcomingSessions.length} Scheduled
                </Badge>
              )}
            </div>
            
            {upcomingSessions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcomingSessions.map((session, index) => (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <Card className="bg-card/50 border-border/50 hover:border-blue-500/30 transition-all duration-300 overflow-hidden group">
                      <div className="aspect-video relative overflow-hidden bg-gradient-to-br from-blue-500/10 to-blue-600/10">
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                          <div className="w-12 h-12 bg-blue-500/80 rounded-full flex items-center justify-center">
                            <Calendar className="w-6 h-6 text-white" />
                          </div>
                        </div>
                        
                        <div className="absolute top-4 left-4">
                          {getStatusBadge(session.status)}
                        </div>
                      </div>
                      
                      <CardContent className="p-4 space-y-3">
                        <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-blue-500 transition-colors">
                          {session.session_title}
                        </h3>
                        
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="bg-blue-500 text-white text-xs">
                              {session.host_name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium text-sm text-foreground">{session.host_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatSessionDate(session.session_date)}
                            </p>
                          </div>
                        </div>
                        
                        <Button 
                          className="w-full"
                          variant="outline"
                          disabled
                        >
                          <Bell className="w-4 h-4 mr-2" />
                          Set Reminder
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <Card className="bg-card/30 border-border/30">
                <CardContent className="text-center py-12">
                  <Calendar className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Upcoming Sessions</h3>
                  <p className="text-muted-foreground">Check back later for new scheduled sessions</p>
                </CardContent>
              </Card>
            )}
          </motion.div>

          {/* Recent Sessions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center space-x-3 mb-6">
              <Clock className="w-6 h-6 text-gray-500" />
              <h2 className="text-2xl font-bold text-foreground">Recent Sessions</h2>
            </div>
            
            {recentSessions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {recentSessions.map((session, index) => (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <Card className="bg-card/30 border-border/30 hover:border-gray-500/30 transition-all duration-300 group">
                      <div className="aspect-video relative overflow-hidden bg-gradient-to-br from-gray-500/10 to-gray-600/10">
                        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <PlayCircle className="w-5 h-5 text-white" />
                          </div>
                        </div>
                        
                        <div className="absolute bottom-2 right-2 bg-black/70 rounded px-2 py-1 text-white text-xs">
                          45:30
                        </div>
                      </div>
                      
                      <CardContent className="p-3">
                        <h4 className="font-medium text-sm text-foreground line-clamp-2 mb-2">
                          {session.session_title}
                        </h4>
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{session.host_name}</span>
                          <span>2 days ago</span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <Card className="bg-card/30 border-border/30">
                <CardContent className="text-center py-8">
                  <Clock className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No recent sessions available</p>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </div>

        {/* Live Session Modal with Chat */}
        <AnimatePresence>
          {watchingSession && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-50 flex"
              onClick={() => setWatchingSession(null)}
            >
              <div className="flex-1 flex flex-col" onClick={(e) => e.stopPropagation()}>
                {/* Video Area */}
                <div className="flex-1 bg-black flex items-center justify-center">
                  <div className="text-white text-center">
                    <PlayCircle className="w-24 h-24 mx-auto mb-4 opacity-50" />
                    <p className="text-xl">Live Stream Placeholder</p>
                    <p className="text-sm opacity-70">Video player would be embedded here</p>
                  </div>
                </div>
                
                {/* Controls */}
                <div className="bg-black/90 p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Button size="sm" variant="ghost" className="text-white">
                      <Heart className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-white">
                      <Share2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button size="sm" variant="ghost" className="text-white">
                      <Mic className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-white">
                      <Camera className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-white">
                      <Volume2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <Button size="sm" onClick={() => setWatchingSession(null)} className="bg-red-500 hover:bg-red-600">
                    Leave
                  </Button>
                </div>
              </div>
              
              {/* Chat Sidebar */}
              <div className="w-80 bg-background border-l border-border flex flex-col">
                <div className="p-4 border-b border-border">
                  <h3 className="font-semibold text-foreground">Live Chat</h3>
                  <p className="text-sm text-muted-foreground">1,234 watching</p>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {mockChatMessages.map((msg) => (
                    <div key={msg.id} className="flex items-start space-x-2">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback className="text-xs">
                          {msg.user.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-baseline space-x-2">
                          <span className="font-medium text-sm text-foreground">{msg.user}</span>
                          <span className="text-xs text-muted-foreground">{msg.time}</span>
                        </div>
                        <p className="text-sm text-foreground">{msg.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="p-4 border-t border-border">
                  <div className="flex items-center space-x-2">
                    <Input
                      placeholder="Say something..."
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      className="flex-1"
                    />
                    <Button size="sm">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edit Dialog */}
        <EditSessionDialog
          session={editingSession}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onUpdateSession={updateSession}
          updating={updating}
        />

        {/* SDK Session Modal */}
        <AnimatePresence>
          {sdkSession && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-50 flex items-center justify-center"
            >
              <ZoomSDKPlayer
                sessionId={sdkSession?.id || ''}
                meetingNumber={sdkSession?.zoom_meeting_number || ''}
                sessionTitle={sdkSession?.session_title || ''}
                onClose={() => setSdkSession(null)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </TooltipProvider>
  );
}