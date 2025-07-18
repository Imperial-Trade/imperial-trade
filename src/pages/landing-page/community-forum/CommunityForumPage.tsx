import React from "react";
import {
  Users,
  MessageCircle,
  Share2,
  Star,
  Heart,
  Layers,
  UserCheck,
  ArrowRight,
  CheckCircle,
  TrendingUp,
  Zap,
  Shield,
  Trophy,
  Target,
  Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const CommunityForumPage: React.FC = () => {
  const forumChannels = [
    {
      icon: Target,
      title: "Market-Specific Channels",
      subtitle: "Focused Asset Discussion",
      description: "Dedicated channels for focused discussion on specific trading instruments and markets.",
      channels: [
        "#xauusd-gold: Gold trading setups, analysis, and market commentary",
        "#eurusd-majors: Major currency pair analysis and trading opportunities", 
        "#indices-futures: Stock index and futures market discussions",
        "#crypto-digital: Cryptocurrency trading and blockchain market analysis",
        "#commodities: Oil, agricultural products, and commodity market insights"
      ],
      whatItDoes: "Post your charts and analysis specific to an asset and get focused feedback from traders who specialize in that market.",
      gradient: "from-blue-500/20 to-cyan-500/20"
    },
    {
      icon: Eye,
      title: "Concept Channels",
      subtitle: "Deep Strategy Discussion",
      description: "Channels dedicated to specific trading methodologies and advanced concepts.",
      channels: [
        "#risk-management: Position sizing, portfolio theory, and capital preservation strategies",
        "#ict-smc-concepts: Inner Circle Trader and Smart Money Concepts discussions",
        "#market-structure: Higher timeframe analysis and institutional order flow",
        "#trading-psychology: Mental game, emotional control, and performance optimization",
        "#technical-analysis: Chart patterns, indicators, and analytical methodologies"
      ],
      whatItDoes: "Ask deep questions about specific strategies or concepts and get detailed explanations from experienced practitioners.",
      gradient: "from-purple-500/20 to-indigo-500/20"
    },
    {
      icon: TrendingUp,
      title: "Performance Channels",
      subtitle: "Growth-Focused Environment",
      description: "Safe spaces for performance review, trade analysis, and psychological development.",
      channels: [
        "#trade-review: Post winning and losing trades for community analysis and feedback",
        "#psychology-check-in: Discuss trading psychology struggles and mental challenges",
        "#performance-analytics: Share trading statistics and performance metrics for review",
        "#goal-setting: Set and track trading goals with community accountability",
        "#success-stories: Celebrate wins and share breakthrough moments with the community"
      ],
      whatItDoes: "A judgment-free zone for growth where you can discuss wins, losses, and psychological struggles openly.",
      gradient: "from-green-500/20 to-emerald-500/20"
    }
  ];

  const communityFeatures = [
    {
      icon: Eye,
      title: "The 'Second Opinion' Advantage",
      description: "Get community validation before trade execution to spot potential blind spots.",
      benefits: [
        "Pre-trade validation from experienced traders",
        "Catch mistakes before they cost money", 
        "Build confidence in good setups",
        "Learn from diverse perspectives"
      ]
    },
    {
      icon: Share2,
      title: "Crowdsourced Strategy Refinement",
      description: "Collaborative backtesting and strategy development with community input.",
      benefits: [
        "Community backtesting assistance",
        "Strategy optimization feedback",
        "Collective wisdom application",
        "Risk assessment from multiple angles"
      ]
    },
    {
      icon: Shield,
      title: "Professional Oversight",
      description: "Active participation from professional analysts providing expert guidance.",
      benefits: [
        "Daily market outlooks from pros",
        "Professional trade idea feedback",
        "Expert answers to complex questions",
        "Institutional perspective sharing"
      ]
    }
  ];

  const communityStats = [
    {
      icon: Users,
      value: "50,000+",
      label: "Active Members",
      description: "Serious traders worldwide"
    },
    {
      icon: MessageCircle,
      value: "1,000+",
      label: "Daily Posts",
      description: "Active discussions daily"
    },
    {
      icon: Trophy,
      value: "24/7",
      label: "Community Support",
      description: "Always someone online"
    }
  ];

  const testimonials = [
    {
      quote: "The community saved me from a terrible trade last week. Posted my analysis and three experienced traders pointed out the same flaw I missed.",
      author: "Alex M.",
      role: "Intermediate Trader",
      avatar: "A"
    },
    {
      quote: "Having access to professional analysts in the chat is incredible. They don't just give signals - they teach you how to think.",
      author: "Sarah L.", 
      role: "Advanced Trader",
      avatar: "S"
    },
    {
      quote: "This isn't just a forum - it's a brotherhood of serious traders who actually help each other succeed.",
      author: "Marcus R.",
      role: "Professional Trader",
      avatar: "M"
    }
  ];

  const stats = [
    { value: "50k+", label: "Global Members", subtitle: "Worldwide Community" },
    { value: "1k+", label: "Daily Interactions", subtitle: "Active Discussions" },
    { value: "24/7", label: "Community Support", subtitle: "Always Available" }
  ];

  return (
    <div className="bg-background min-h-screen font-sans">
      {/* Hero Section */}
      <section className="relative py-24 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-pink-500/5" />
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center space-y-8">
            <div className="space-y-6">
              <Badge variant="outline" className="inline-flex items-center gap-2 border-pink-500/20 text-pink-600 bg-pink-500/5">
                <Users className="h-4 w-4" />
                The Collective Intelligence
              </Badge>
              <h1 className="text-6xl font-bold leading-tight tracking-tight">
                <span className="bg-gradient-to-r from-pink-500 via-rose-400 to-pink-600 bg-clip-text text-transparent">
                  Community Forum
                </span>
                <br />
                <span className="text-foreground">Never Trade Alone</span>
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed max-w-4xl mx-auto">
                A curated, professional ecosystem designed to foster collaboration, eliminate bad habits, 
                and keep you connected to a network of serious, like-minded peers. Trading is lonely, but it doesn't have to be.
              </p>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
              {stats.map((stat, index) => (
                <div key={index} className="text-center space-y-2">
                  <div className="text-3xl font-bold text-pink-600">{stat.value}</div>
                  <div className="text-sm font-medium text-foreground">{stat.label}</div>
                  <div className="text-xs text-muted-foreground">{stat.subtitle}</div>
                </div>
              ))}
            </div>
            
            <div className="flex items-center justify-center gap-4">
              <Button size="lg" className="bg-pink-600 hover:bg-pink-700 text-white px-8">
                Join Our Community
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button variant="outline" size="lg" className="border-pink-500/20 hover:bg-pink-500/5 px-8">
                Explore Channels
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Forum Structure */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-rose-400 to-pink-600 bg-clip-text text-transparent">
                Structured Channels for Focused Discussion
              </span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Our forum is organized into specific channels to ensure focused, productive discussions that help you grow as a trader.
            </p>
          </div>

          <div className="space-y-8">
            {forumChannels.map((channel, index) => (
              <Card key={index} className="group border-border/50 hover:border-pink-500/30 transition-all duration-300 overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-br ${channel.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <div className="relative">
                  <CardHeader className="space-y-4">
                    <div className="flex items-start gap-6">
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-pink-500/10 to-pink-500/5 group-hover:from-pink-500/20 group-hover:to-pink-500/10 transition-all duration-300">
                        <channel.icon className="h-8 w-8 text-pink-600" />
                      </div>
                      <div className="flex-1">
                        <div className="space-y-1">
                          <CardTitle className="text-2xl text-foreground group-hover:text-pink-600 transition-colors">
                            {channel.title}
                          </CardTitle>
                          <div className="text-sm font-medium text-pink-600">
                            {channel.subtitle}
                          </div>
                        </div>
                        <CardDescription className="text-muted-foreground mt-3 leading-relaxed">
                          {channel.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-6">
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide">What This Means:</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed italic bg-muted/30 p-4 rounded-lg">
                        "{channel.whatItDoes}"
                      </p>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide">Featured Channels:</h4>
                      <div className="space-y-2">
                        {channel.channels.slice(0, 4).map((channelItem, idx) => (
                          <div key={idx} className="flex items-start gap-3 text-sm bg-muted/30 p-3 rounded-lg">
                            <div className="w-1.5 h-1.5 rounded-full bg-pink-600 mt-2 flex-shrink-0" />
                            <span className="text-muted-foreground leading-relaxed">{channelItem}</span>
                          </div>
                        ))}
                        {channel.channels.length > 4 && (
                          <div className="text-xs text-pink-600 font-medium pl-4">
                            +{channel.channels.length - 4} more specialized channels
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Community Features */}
      <section className="py-24 px-6 bg-gradient-to-br from-pink-500/5 to-background">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Community-Powered Growth
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              It breaks the cycle of isolation where bad habits are formed and creates an environment of accountability and shared knowledge.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {communityFeatures.map((feature, index) => (
              <Card key={index} className="text-center border-border/50 hover:border-pink-500/30 transition-all duration-300">
                <CardHeader className="space-y-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500/10 to-pink-500/5 mx-auto">
                    <feature.icon className="h-8 w-8 text-pink-600" />
                  </div>
                  <CardTitle className="text-xl text-foreground">
                    {feature.title}
                  </CardTitle>
                  <CardDescription className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-3">
                    {feature.benefits.map((benefit, idx) => (
                      <div key={idx} className="flex items-center gap-3 text-sm">
                        <CheckCircle className="h-4 w-4 text-pink-600 flex-shrink-0" />
                        <span className="text-muted-foreground leading-relaxed">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Community Stats */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {communityStats.map((stat, index) => (
              <Card key={index} className="text-center border-border/50 hover:border-pink-500/30 transition-all duration-300">
                <CardContent className="p-8">
                  <div className="space-y-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500/10 to-pink-500/5 mx-auto">
                      <stat.icon className="h-8 w-8 text-pink-600" />
                    </div>
                    <div>
                      <div className="text-4xl font-bold text-pink-600 mb-2">{stat.value}</div>
                      <div className="text-lg font-semibold text-foreground">{stat.label}</div>
                      <div className="text-sm text-muted-foreground">{stat.description}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-6 bg-gradient-to-br from-pink-500/5 to-background">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Community Success Stories
            </h2>
            <p className="text-lg text-muted-foreground">
              Real experiences from real traders in our community.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-border/50 hover:border-pink-500/30 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <blockquote className="text-muted-foreground leading-relaxed italic">
                      "{testimonial.quote}"
                    </blockquote>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500/20 to-pink-500/10 flex items-center justify-center font-semibold text-pink-600">
                        {testimonial.avatar}
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">{testimonial.author}</div>
                        <div className="text-sm text-pink-600">{testimonial.role}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 via-background to-rose-400/5" />
        <div className="max-w-4xl mx-auto text-center relative">
          <div className="space-y-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-pink-500/10 border border-pink-500/20">
              <Zap className="h-10 w-10 text-pink-600" />
            </div>
            
            <div className="space-y-4">
              <h2 className="text-4xl font-bold text-foreground">
                Join the 
                <span className="bg-gradient-to-r from-pink-500 to-rose-400 bg-clip-text text-transparent"> Trading Brotherhood</span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Connect with 50,000+ serious traders who support each other's growth and success. Trading doesn't have to be a lonely journey.
              </p>
            </div>
            
            <div className="flex items-center justify-center gap-4">
              <Button size="lg" className="bg-pink-600 hover:bg-pink-700 text-white px-8">
                Join the Community
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button variant="outline" size="lg" className="border-pink-500/20 hover:bg-pink-500/5 px-8">
                Explore Channels
              </Button>
            </div>
            
            <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-pink-600" />
                Free to join
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-pink-600" />
                Professional moderation
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-pink-600" />
                Expert analyst access
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CommunityForumPage;