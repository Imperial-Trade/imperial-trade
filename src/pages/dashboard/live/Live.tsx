import React, { useState, useEffect, useRef } from "react";
import { LiveSession } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Radio,
  Users,
  MessageCircle,
  Send,
  Volume2,
  VolumeX,
  Maximize,
  Calendar,
  Clock,
  TrendingUp, // Ensure TrendingUp is imported
  TrendingDown,
  PlayCircle,
  Timer,
} from "lucide-react";

export default function Live() {
  const [currentSession, setCurrentSession] = useState(null);
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [viewerCount, setViewerCount] = useState(1247);
  const [isJoiningZoom, setIsJoiningZoom] = useState(false);
  const [zoomJoined, setZoomJoined] = useState(false);
  const tradingviewWidgetRef = useRef(null);

  // Load all sessions and determine current/upcoming
  const loadSessions = async () => {
    setIsLoading(true);
    try {
      const now = new Date();
      const allSessions = await LiveSession.list("-session_date");

      // Find current or next session
      let currentSessionFound = null;
      const upcomingSessionsList = [];

      for (const session of allSessions) {
        const sessionTime = new Date(session.session_date);
        const timeDiff = sessionTime.getTime() - now.getTime();

        // If session is within 5 minutes of start time or already started, it's current
        if (timeDiff <= 5 * 60 * 1000 && timeDiff >= -2 * 60 * 60 * 1000) {
          // 5 min before to 2 hours after
          if (!currentSessionFound) {
            currentSessionFound = session;
          }
        }
        // If session is in the future, it's upcoming
        else if (timeDiff > 5 * 60 * 1000) {
          upcomingSessionsList.push(session);
        }
      }

      setCurrentSession(currentSessionFound);
      setUpcomingSessions(upcomingSessionsList.slice(0, 3)); // Show next 3 sessions

      // Determine if we're live
      if (currentSessionFound) {
        const sessionTime = new Date(currentSessionFound.session_date);
        const isScheduledTime = now >= sessionTime;
        setIsLive(isScheduledTime || currentSessionFound.status === "live");
      } else {
        setIsLive(false);
      }
    } catch (error) {
      console.error("Failed to fetch live sessions:", error);
      setCurrentSession(null);
      setIsLive(false);
    }
    setIsLoading(false);
  };

  // Countdown calculation
  useEffect(() => {
    if (!currentSession || isLive) {
      setCountdown(null);
      return;
    }

    const calculateCountdown = () => {
      const now = new Date();
      const sessionTime = new Date(currentSession.session_date);
      const timeDiff = sessionTime.getTime() - now.getTime();

      if (timeDiff <= 0) {
        setIsLive(true);
        setCountdown(null);
        return;
      }

      const hours = Math.floor(timeDiff / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

      setCountdown({ hours, minutes, seconds });
    };

    calculateCountdown();
    const interval = setInterval(calculateCountdown, 1000);
    return () => clearInterval(interval);
  }, [currentSession, isLive]);

  // Load sessions on mount and refresh periodically
  useEffect(() => {
    loadSessions();
    const interval = setInterval(loadSessions, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Viewer count simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setViewerCount((prev) => prev + Math.floor(Math.random() * 10) - 5);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // TradingView Widget Loader - Enhanced
  useEffect(() => {
    const loadTradingViewWidget = () => {
      // Clear any existing content
      if (tradingviewWidgetRef.current) {
        tradingviewWidgetRef.current.innerHTML = "";
      }

      if (tradingviewWidgetRef.current) {
        const script = document.createElement("script");
        script.type = "text/javascript";
        script.src =
          "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
        script.async = true;

        script.innerHTML = JSON.stringify({
          symbols: [
            { description: "S&P 500", proName: "FOREXCOM:SPXUSD" },
            { description: "NASDAQ 100", proName: "FOREXCOM:NSXUSD" },
            { description: "DOW JONES", proName: "FOREXCOM:DJI" },
            { description: "EUR/USD", proName: "FX_IDC:EURUSD" },
            { description: "GBP/USD", proName: "FX_IDC:GBPUSD" },
            { description: "USD/JPY", proName: "FX_IDC:USDJPY" },
            { description: "GOLD", proName: "OANDA:XAUUSD" },
            { description: "BITCOIN", proName: "BITSTAMP:BTCUSD" },
            { description: "ETHEREUM", proName: "BITSTAMP:ETHUSD" },
            { description: "CRUDE OIL", proName: "NYMEX:CL1!" },
          ],
          showSymbolLogo: true,
          colorTheme: "dark",
          isTransparent: false,
          displayMode: "adaptive",
          locale: "en",
        });

        tradingviewWidgetRef.current.appendChild(script);
      }
    };

    // Small delay to ensure the DOM is ready
    const timer = setTimeout(loadTradingViewWidget, 100);

    return () => clearTimeout(timer);
  }, []);

  // Extract Zoom meeting ID for display
  const extractZoomMeetingId = (url) => {
    if (!url) return null;
    try {
      const match = url.match(/\/j\/(\d+)/);
      return match ? match[1] : null;
    } catch (e) {
      return null;
    }
  };

  // Get embeddable Zoom URL with automatic passcode handling
  const getZoomEmbedUrl = (url) => {
    if (!url) return null;
    try {
      const urlObj = new URL(url);
      const meetingId = extractZoomMeetingId(url);
      if (meetingId) {
        // Build the embed URL with passcode if available
        let embedUrl = `${urlObj.origin}/wc/${meetingId}/join`;

        // Add additional parameters for seamless joining
        const params = new URLSearchParams();
        if (currentSession?.zoom_passcode) {
          params.append("pwd", currentSession.zoom_passcode);
        }
        params.append("prefer", "1"); // Prefer web client
        params.append("un", "ImperialTrader"); // Default username

        if (params.toString()) {
          embedUrl += (embedUrl.includes("?") ? "&" : "?") + params.toString();
        }

        return embedUrl;
      }
      return null;
    } catch (e) {
      console.error("Invalid Zoom URL:", e);
      return null;
    }
  };

  // Enhanced auto-join function with passcode handling
  const handleJoinZoom = () => {
    if (currentSession?.zoom_meeting_url) {
      setIsJoiningZoom(true);

      // If there's a passcode, we can also try to auto-fill it via JavaScript
      if (currentSession?.zoom_passcode) {
        // Store passcode in session storage for the Zoom client to potentially use
        sessionStorage.setItem("zoom_passcode", currentSession.zoom_passcode);
      }

      // Small delay to show joining state
      setTimeout(() => {
        setZoomJoined(true);
        setIsJoiningZoom(false);
      }, 1500);
    }
  };

  // Auto-join when session goes live (if enabled)
  useEffect(() => {
    // Only attempt auto-join if currentSession exists, it's live,
    // auto_start_enabled is true, and we haven't joined yet.
    if (
      isLive &&
      currentSession &&
      currentSession.auto_start_enabled &&
      !zoomJoined
    ) {
      // Auto-join 30 seconds after session starts
      const autoJoinTimer = setTimeout(() => {
        handleJoinZoom();
      }, 30000);

      return () => clearTimeout(autoJoinTimer);
    }
  }, [isLive, currentSession, zoomJoined]);

  const embedUrl = currentSession
    ? getZoomEmbedUrl(currentSession.zoom_meeting_url)
    : null;

  const formatCountdown = (countdown) => {
    if (!countdown) return null;
    const { hours, minutes, seconds } = countdown;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const formatSessionTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen p-6 bg-background">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div
              className={`w-3 h-3 rounded-full ${
                isLive ? "bg-accent-red animate-pulse" : "bg-secondary"
              }`}
            ></div>
            <span
              className={`font-semibold ${
                isLive ? "text-accent-red" : "text-secondary"
              }`}
            >
              {isLive ? "LIVE" : countdown ? "STARTING SOON" : "OFFLINE"}
            </span>
            {isLive && (
              <div className="flex items-center gap-2 text-secondary">
                <Users className="w-4 h-4" />
                <span>{viewerCount.toLocaleString()} viewers</span>
              </div>
            )}
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-primary mb-2">
            Live Trading <span className="text-accent-red">Sessions</span>
          </h1>
          <p className="text-secondary text-lg">
            {currentSession
              ? `${currentSession.session_title} with ${currentSession.host_name}`
              : "No sessions scheduled at the moment"}
          </p>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Main Stream */}
          <div className="lg:col-span-3">
            <Card className="glass-effect border-default mb-6">
              <CardContent className="p-0">
                <div className="relative aspect-video bg-background rounded-lg overflow-hidden">
                  {isLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-green"></div>
                    </div>
                  ) : zoomJoined && embedUrl ? (
                    // Zoom meeting embedded with automatic passcode handling
                    <iframe
                      src={embedUrl}
                      title={currentSession?.session_title || "Live Session"}
                      className="absolute inset-0 w-full h-full border-0"
                      allow="camera; microphone; fullscreen; speaker; display-capture"
                      allowFullScreen
                    ></iframe>
                  ) : isJoiningZoom ? (
                    // Enhanced joining state with passcode info
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-accent-green/20 to-accent-blue/20">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-4 border-accent-green border-t-transparent mx-auto mb-6"></div>
                        <h3 className="text-2xl font-bold text-primary mb-2">
                          Joining Live Session...
                        </h3>
                        <p className="text-secondary">
                          {currentSession?.zoom_passcode
                            ? "Connecting with automatic passcode entry"
                            : "Connecting you to the trading room"}
                        </p>
                      </div>
                    </div>
                  ) : isLive && currentSession ? (
                    // Ready to join state with passcode info
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-accent-green/20 to-accent-blue/20">
                      <div className="text-center">
                        <div className="w-20 h-20 bg-accent-green rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                          <PlayCircle className="w-12 h-12 text-white" />
                        </div>
                        <h3 className="text-3xl font-bold text-primary mb-4">
                          Session is Live!
                        </h3>
                        <p className="text-xl text-secondary mb-6">
                          {currentSession.session_title}
                        </p>
                        <Button
                          onClick={handleJoinZoom}
                          className="bg-accent-green hover:bg-green-500 text-white font-semibold px-8 py-4 text-lg rounded-xl transition-all duration-300 transform hover:scale-105"
                        >
                          <PlayCircle className="w-6 h-6 mr-2" />
                          Join Live Session
                        </Button>
                        <div className="flex items-center justify-center gap-4 text-secondary mt-4">
                          <div className="flex items-center gap-2">
                            <Users className="w-5 h-5" />
                            <span>Host: {currentSession.host_name}</span>
                          </div>
                          {currentSession.zoom_passcode && (
                            <div className="flex items-center gap-2">
                              <span className="text-accent-green">
                                ✓ Passcode Auto-Applied
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : countdown && currentSession ? (
                    // Countdown state
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-accent-green/20 to-accent-blue/20">
                      <div className="text-center">
                        <Timer className="w-20 h-20 text-accent-green mx-auto mb-6 animate-pulse" />
                        <h3 className="text-3xl font-bold text-primary mb-4">
                          Starting Soon
                        </h3>
                        <div className="text-6xl font-mono font-bold text-accent-green mb-4">
                          {formatCountdown(countdown)}
                        </div>
                        <p className="text-xl text-secondary mb-6">
                          {currentSession.session_title}
                        </p>
                        <div className="flex items-center justify-center gap-4 text-secondary">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-5 h-5" />
                            <span>
                              {formatSessionTime(currentSession.session_date)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="w-5 h-5" />
                            <span>Host: {currentSession.host_name}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // No session state
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <Radio className="w-16 h-16 text-secondary/50 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-primary mb-2">
                          No Live Session
                        </h3>
                        <p className="text-secondary">
                          {upcomingSessions.length > 0
                            ? `Next session: ${
                                upcomingSessions[0].session_title
                              } on ${formatSessionTime(
                                upcomingSessions[0].session_date
                              )}`
                            : "Check back later for upcoming sessions"}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Live Badge */}
                  {isLive && (
                    <div className="absolute top-4 left-4">
                      <Badge className="bg-accent-red text-white animate-pulse">
                        🔴 LIVE
                      </Badge>
                    </div>
                  )}

                  {/* Countdown Badge */}
                  {countdown && (
                    <div className="absolute top-4 left-4">
                      <Badge className="bg-accent-green text-white">
                        <Timer className="w-3 h-3 mr-1" />
                        {formatCountdown(countdown)}
                      </Badge>
                    </div>
                  )}

                  {/* Viewer Count */}
                  {(isLive || zoomJoined) && (
                    <div className="absolute top-4 right-4">
                      <div className="bg-black/50 rounded-full px-3 py-1 text-primary text-sm flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {viewerCount.toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Current Session Info */}
            {currentSession && (
              <Card className="glass-effect border-default mb-6">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-primary mb-2">
                        {currentSession.session_title}
                      </h3>
                      <p className="text-secondary mb-4">
                        {currentSession.description}
                      </p>
                    </div>
                    {!zoomJoined && currentSession.zoom_meeting_url && (
                      <Button
                        onClick={() =>
                          window.open(currentSession.zoom_meeting_url, "_blank")
                        }
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <PlayCircle className="w-4 h-4 mr-2" />
                        {isLive ? "Join Externally" : "Join Early"}
                      </Button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-secondary" />
                      <span className="text-secondary">
                        {isLive
                          ? `Live since ${new Date(
                              currentSession.session_date
                            ).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}`
                          : `Starts at ${new Date(
                              currentSession.session_date
                            ).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-secondary" />
                      <span className="text-secondary">
                        Host: {currentSession.host_name}
                      </span>
                    </div>
                    {currentSession.zoom_meeting_id && (
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="border-default text-secondary"
                        >
                          Meeting ID: {currentSession.zoom_meeting_id}
                        </Badge>
                      </div>
                    )}
                    {currentSession.zoom_passcode && (
                      <div className="flex items-center gap-2">
                        <Badge className="bg-accent-green/10 text-accent-green">
                          ✓ Passcode Auto-Handled
                        </Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Live Market Data (TradingView Ticker Tape) */}
            <Card className="glass-effect border-default">
              <CardHeader>
                <CardTitle className="text-primary flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-accent-green" />
                  Live Market Data
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div
                  ref={tradingviewWidgetRef}
                  className="tradingview-widget-container min-h-[80px] w-full"
                >
                  <div className="tradingview-widget-container__widget"></div>
                  {/* Fallback content while loading */}
                  <div className="flex items-center justify-center h-20 text-secondary">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-accent-green border-t-transparent mr-2"></div>
                    Loading live market data...
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Upcoming Sessions */}
            <Card className="glass-effect border-default">
              <CardHeader>
                <CardTitle className="text-primary flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-accent-green" />
                  Upcoming Sessions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {upcomingSessions.length > 0 ? (
                  upcomingSessions.map((session, index) => (
                    <div
                      key={session.id || index}
                      className="p-3 bg-surface rounded-lg"
                    >
                      <h4 className="font-semibold text-primary text-sm mb-1">
                        {session.session_title}
                      </h4>
                      <p className="text-secondary text-xs mb-2 line-clamp-2">
                        {session.description}
                      </p>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-secondary">
                          {session.host_name}
                        </span>
                        <span className="text-accent-green">
                          {formatSessionTime(session.session_date)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-secondary text-center py-4">
                    No upcoming sessions scheduled
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Session Controls */}
            {currentSession && !zoomJoined && (
              <Card className="glass-effect border-default">
                <CardHeader>
                  <CardTitle className="text-primary flex items-center gap-2">
                    <PlayCircle className="w-5 h-5 text-accent-blue" />
                    Session Access
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <Button
                    onClick={handleJoinZoom}
                    disabled={!isLive}
                    className="w-full bg-accent-green hover:bg-green-500 text-white disabled:bg-gray-600 disabled:cursor-not-allowed"
                  >
                    {isLive ? "Join Live Session" : "Session Not Started"}
                  </Button>

                  <Button
                    onClick={() =>
                      window.open(currentSession.zoom_meeting_url, "_blank")
                    }
                    variant="outline"
                    className="w-full border-default text-secondary hover:bg-surface hover:text-primary"
                  >
                    Open in New Tab
                  </Button>

                  {currentSession.zoom_meeting_id && (
                    <div className="text-center text-sm text-secondary">
                      <p>
                        Meeting ID:{" "}
                        <span className="font-mono">
                          {currentSession.zoom_meeting_id}
                        </span>
                      </p>
                      {currentSession.zoom_passcode && (
                        <p className="text-accent-green">
                          <span className="inline-block w-2 h-2 bg-accent-green rounded-full mr-2"></span>
                          Passcode automatically applied
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
