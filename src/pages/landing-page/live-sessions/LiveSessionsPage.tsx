import React from "react";
import {
  Video,
  Users,
  Calendar,
  Presentation,
  Clock,
  Database,
  ArrowRight,
  CheckCircle,
  Play,
  Zap,
  Eye,
  MessageSquare,
  Monitor,
  Archive
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const LiveSessionsPage: React.FC = () => {
  const sessionTypes = [
    {
      icon: Monitor,
      title: "Pre-Session Briefing",
      subtitle: "Market Preparation (15 mins)",
      description: "Every session starts with comprehensive market preparation to set the stage for professional analysis.",
      features: [
        "Economic Calendar Review: Analysis of the day's high-impact events and potential market movers",
        "Market Themes Identification: Current macro themes affecting major currency pairs and commodities",
        "Key Levels Mapping: Critical support/resistance levels and institutional price zones to watch",
        "Session Focus Areas: Specific instruments and setups the host will be monitoring during the session",
        "Risk Assessment: Current market volatility and risk considerations for the trading day"
      ],
      gradient: "from-purple-500/20 to-violet-500/20"
    },
    {
      icon: Eye,
      title: "Live Analysis & Execution",
      subtitle: "Real-Time Trading (Core Session)",
      description: "The heart of the session - watch professional traders analyze and execute trades in real-time.",
      features: [
        "Live Chart Sharing: Professional charting platform shared with real-time analysis overlay",
        "Top-Down Analysis: Multi-timeframe analysis from monthly down to intraday charts",
        "Setup Identification: Real-time identification and explanation of valid trading setups",
        "Live Trade Execution: When valid setups appear, trades are executed live with full transparency",
        "Risk Management: Live demonstration of position sizing, stop placement, and trade management",
        "Market Psychology: Explanation of sentiment indicators and institutional positioning"
      ],
      gradient: "from-blue-500/20 to-cyan-500/20"
    },
    {
      icon: MessageSquare,
      title: "Interactive Q&A",
      subtitle: "Direct Expert Access (Throughout)",
      description: "The most valuable feature - direct access to professional traders for your specific questions.",
      features: [
        "Live Question Feed: Dedicated moderator feeds your questions from chat to the host",
        "Personal Analysis Review: Submit your own chart analysis for professional feedback",
        "Strategy Clarification: Get immediate explanations of complex trading concepts",
        "Market Opinion Requests: Ask for professional opinions on specific currency pairs or setups",
        "Psychology Support: Discuss trading psychology challenges with experienced professionals",
        "Career Guidance: Advice on developing your trading career and skill progression"
      ],
      gradient: "from-green-500/20 to-emerald-500/20"
    }
  ];

  const sessionFeatures = [
    {
      icon: Calendar,
      title: "Daily Scheduled Sessions",
      description: "Professional coverage during key market hours with predictable scheduling.",
      details: [
        "London Session (8:00-12:00 GMT): European market opening coverage",
        "New York Session (13:00-17:00 GMT): US market overlap and major USD pairs",
        "Asian Preparation (21:00 GMT Sunday): Week ahead preparation and Asian session preview"
      ]
    },
    {
      icon: Archive,
      title: "The Archive Vault",
      description: "Complete library of recorded sessions with searchable content and timestamps.",
      details: [
        "Searchable Content: Find specific topics like 'Fed day analysis' or 'Gold breakout' instantly",
        "Timestamped Topics: Jump directly to specific discussions within each session",
        "24-Hour Upload: All sessions archived and available within 24 hours",
        "Mobile Access: Watch archived sessions on any device, anywhere"
      ]
    },
    {
      icon: Users,
      title: "Professional Integration",
      description: "High-quality technical setup with robust interactive features.",
      details: [
        "Professional Zoom Setup: High-quality audio/video with minimal latency",
        "Screen Sharing: Crystal clear chart sharing with annotation capabilities",
        "Interactive Features: Polls, emoji reactions, and chat moderation",
        "Backup Systems: Redundant streaming to ensure session continuity"
      ]
    }
  ];

  const upcomingSessions = [
    {
      date: "Today",
      time: "3:00 PM GMT",
      title: "London Close Analysis",
      host: "Senior Analyst Marcus",
      focus: "EUR/USD breakout setup"
    },
    {
      date: "Tomorrow",
      time: "8:00 AM GMT", 
      title: "London Open Preparation",
      host: "Lead Trader Sarah",
      focus: "Weekly market outlook"
    },
    {
      date: "Friday",
      time: "1:00 PM GMT",
      title: "NFP Event Trading",
      host: "Chief Analyst David",
      focus: "High-impact news strategy"
    }
  ];

  const stats = [
    { value: "Daily", label: "Live Sessions", subtitle: "Never Miss A Day" },
    { value: "5+", label: "Expert Hosts", subtitle: "Educational Contributors" },
    { value: "1000+", label: "Archived Sessions", subtitle: "Complete Library" }
  ];

  return (
    <div className="bg-background min-h-screen font-sans">
      {/* Hero Section */}
      <section className="relative py-24 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-purple-500/5" />
        <div className="max-w-7xl mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-6">
                <Badge variant="outline" className="inline-flex items-center gap-2 border-purple-500/20 text-purple-600 bg-purple-500/5">
                  <Video className="h-4 w-4" />
                  The Virtual Trading Floor
                </Badge>
                <h1 className="text-6xl font-bold leading-tight tracking-tight">
                  <span className="bg-gradient-to-r from-purple-500 via-violet-400 to-purple-600 bg-clip-text text-transparent">
                    Live Sessions
                  </span>
                  <br />
                  <span className="text-foreground">Real-Time Mastery</span>
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  Direct, unfiltered access to the mind of a professional trader during the most critical hours of the trading day. 
                  Your chance to ask questions you can't find answers to in books or videos.
                </p>
              </div>
              
              {/* Stats */}
              <div className="grid grid-cols-3 gap-6">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center space-y-2">
                    <div className="text-3xl font-bold text-purple-600">{stat.value}</div>
                    <div className="text-sm font-medium text-foreground">{stat.label}</div>
                    <div className="text-xs text-muted-foreground">{stat.subtitle}</div>
                  </div>
                ))}
              </div>
              
              <div className="flex items-center gap-4">
                <Button size="lg" className="bg-purple-600 hover:bg-purple-700 text-white px-8">
                  Join Next Session
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button variant="outline" size="lg" className="border-purple-500/20 hover:bg-purple-500/5 px-8">
                  View Schedule
                </Button>
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-violet-500/20 rounded-3xl blur-3xl" />
              <div className="relative bg-card border border-purple-500/20 rounded-2xl p-6">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                      <span className="text-sm font-medium text-foreground">LIVE NOW</span>
                    </div>
                    <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20">London Session</Badge>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="text-xl font-bold text-foreground">EUR/USD Analysis</div>
                    <div className="text-sm text-muted-foreground">
                      Host: <span className="text-foreground font-medium">Senior Analyst Marcus</span>
                    </div>
                    
                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                      <div className="text-xs text-muted-foreground mb-2">Current Focus:</div>
                      <div className="text-sm text-foreground">"Analyzing potential breakout above 1.0850 resistance. Looking for institutional confirmation."</div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-purple-600" />
                        <span className="text-muted-foreground">247 viewers</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-purple-600" />
                        <span className="text-muted-foreground">35 min remaining</span>
                      </div>
                    </div>
                    
                    <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                      <Play className="mr-2 h-4 w-4" />
                      Join Live Session
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Session Structure */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-violet-400 to-purple-600 bg-clip-text text-transparent">
                Session Structure: Professional Format
              </span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Every live session follows a professional structure designed to maximize learning and provide real-time market insights.
            </p>
          </div>

          <div className="space-y-8">
            {sessionTypes.map((session, index) => (
              <Card key={index} className="group border-border/50 hover:border-purple-500/30 transition-all duration-300 overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-br ${session.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <div className="relative">
                  <CardHeader className="space-y-4">
                    <div className="flex items-start gap-6">
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 group-hover:from-purple-500/20 group-hover:to-purple-500/10 transition-all duration-300">
                        <session.icon className="h-8 w-8 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <div className="space-y-1">
                          <CardTitle className="text-2xl text-foreground group-hover:text-purple-600 transition-colors">
                            {session.title}
                          </CardTitle>
                          <div className="text-sm font-medium text-purple-600">
                            {session.subtitle}
                          </div>
                        </div>
                        <CardDescription className="text-muted-foreground mt-3 leading-relaxed">
                          {session.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-6">
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide">Session Components:</h4>
                      <div className="space-y-2">
                        {session.features.map((feature, idx) => (
                          <div key={idx} className="flex items-start gap-3 text-sm bg-muted/30 p-3 rounded-lg">
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-600 mt-2 flex-shrink-0" />
                            <span className="text-muted-foreground leading-relaxed">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Session Features & Upcoming Sessions */}
      <section className="py-24 px-6 bg-gradient-to-br from-purple-500/5 to-background">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Features */}
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-8">
                Technical Excellence
              </h2>
              <div className="space-y-6">
                {sessionFeatures.map((feature, index) => (
                  <Card key={index} className="border-border/50 hover:border-purple-500/30 transition-all duration-300">
                    <CardHeader className="space-y-3">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-500/5">
                          <feature.icon className="h-6 w-6 text-purple-600" />
                        </div>
                        <CardTitle className="text-lg text-foreground">
                          {feature.title}
                        </CardTitle>
                      </div>
                      <CardDescription className="text-muted-foreground">
                        {feature.description}
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent>
                      <div className="space-y-2">
                        {feature.details.slice(0, 2).map((detail, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-purple-600 flex-shrink-0 mt-0.5" />
                            <span className="text-muted-foreground leading-relaxed">{detail}</span>
                          </div>
                        ))}
                        {feature.details.length > 2 && (
                          <div className="text-xs text-purple-600 font-medium">
                            +{feature.details.length - 2} more features
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Upcoming Sessions */}
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-8">
                Upcoming Sessions
              </h2>
              <div className="space-y-4">
                {upcomingSessions.map((session, index) => (
                  <Card key={index} className="border-border/50 hover:border-purple-500/30 transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-500/10 flex items-center justify-center">
                            <Calendar className="h-6 w-6 text-purple-600" />
                          </div>
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs border-purple-500/20 text-purple-600">
                              {session.date}
                            </Badge>
                            <span className="text-sm font-medium text-foreground">{session.time}</span>
                          </div>
                          <h3 className="font-semibold text-foreground">{session.title}</h3>
                          <p className="text-sm text-muted-foreground">Host: {session.host}</p>
                          <p className="text-sm text-muted-foreground">Focus: {session.focus}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                <Button className="w-full bg-purple-600/10 hover:bg-purple-600 hover:text-white text-purple-600 border border-purple-600/20">
                  View Full Schedule
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-background to-violet-400/5" />
        <div className="max-w-4xl mx-auto text-center relative">
          <div className="space-y-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-purple-500/10 border border-purple-500/20">
              <Zap className="h-10 w-10 text-purple-600" />
            </div>
            
            <div className="space-y-4">
              <h2 className="text-4xl font-bold text-foreground">
                Join the 
                <span className="bg-gradient-to-r from-purple-500 to-violet-400 bg-clip-text text-transparent"> Virtual Trading Floor</span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Experience what it's like to trade alongside professionals. Learn decision-making processes that can't be taught in books.
              </p>
            </div>
            
            <div className="flex items-center justify-center gap-4">
              <Button size="lg" className="bg-purple-600 hover:bg-purple-700 text-white px-8">
                Access Live Sessions
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button variant="outline" size="lg" className="border-purple-500/20 hover:bg-purple-500/5 px-8">
                Browse Archive
              </Button>
            </div>
            
            <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-purple-600" />
                Daily live sessions
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-purple-600" />
                Interactive Q&A included
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-purple-600" />
                Complete archive access
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LiveSessionsPage;