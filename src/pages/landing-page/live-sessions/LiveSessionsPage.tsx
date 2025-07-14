import React from "react";
import {
  Video,
  Users,
  Calendar,
  Presentation,
  Compass,
  Database,
  ArrowRight,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const LiveSessionsPage: React.FC = () => {
  const features = [
    {
      icon: Video,
      title: "Live Trading Rooms",
      description: "Watch professional traders execute trades in real-time with full transparency.",
      features: ["Live Trading", "Real-time Commentary", "Full Transparency", "Strategy Explanation"],
      usage: "Join live trading rooms and watch professionals trade with real money while explaining their decision-making process.",
      benefits: ["Real-time learning", "Professional insight", "Live commentary"]
    },
    {
      icon: Users,
      title: "Interactive Sessions",
      description: "Participate in interactive sessions with Q&A and real-time discussions.",
      features: ["Live Q&A", "Real-time Chat", "Interactive Polls", "Community Engagement"],
      usage: "Engage directly with professional traders during live sessions through chat and Q&A opportunities.",
      benefits: ["Direct interaction", "Real-time Q&A", "Community engagement"]
    },
    {
      icon: Calendar,
      title: "Market Event Coverage",
      description: "Live coverage of major market events including earnings, economic releases, and news.",
      features: ["Market Events", "Economic Releases", "Earnings Coverage", "News Analysis"],
      usage: "Join special sessions covering major market events and learn how to trade around important announcements.",
      benefits: ["Event coverage", "News analysis", "Market insights"]
    },
    {
      icon: Presentation,
      title: "Educational Workshops",
      description: "Deep-dive educational workshops focusing on specific strategies and techniques.",
      features: ["Strategy Workshops", "Technical Analysis", "Risk Management", "Psychology Training"],
      usage: "Participate in focused workshops that dive deep into specific trading strategies and techniques.",
      benefits: ["Focused learning", "Strategy deep-dives", "Skill development"]
    },
    {
      icon: Compass,
      title: "Market Analysis Sessions",
      description: "Daily market analysis sessions covering technical and fundamental analysis.",
      features: ["Daily Analysis", "Technical Review", "Fundamental Analysis", "Market Outlook"],
      usage: "Join daily market analysis sessions to understand current market conditions and opportunities.",
      benefits: ["Daily insights", "Market understanding", "Analysis training"]
    },
    {
      icon: Database,
      title: "Session Library",
      description: "Access to thousands of recorded sessions for review and continued learning.",
      features: ["Session Archive", "Searchable Content", "Offline Access", "Mobile Streaming"],
      usage: "Access our complete library of recorded sessions for review and continued learning at your own pace.",
      benefits: ["Complete archive", "Flexible learning", "Mobile access"]
    }
  ];

  const stats = [
    { value: "Daily", label: "Live Sessions" },
    { value: "5+", label: "Expert Traders" },
    { value: "1000+", label: "Recorded Sessions" }
  ];

  return (
    <div className="bg-background min-h-screen font-sans">
      {/* Hero Section */}
      <section className="py-20 px-6 monochrome-gradient">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-6">
                <Badge variant="outline" className="inline-flex items-center gap-2 border-border text-muted-foreground">
                  <Video className="h-4 w-4" />
                  Interactive Live Trading
                </Badge>
                <h1 className="text-5xl font-bold text-foreground leading-tight tracking-tight">
                  Live Trading Sessions
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  Join professional traders in live sessions to see real trading in action and learn decision-making processes in real-time.
                </p>
              </div>
              
              {/* Stats */}
              <div className="grid grid-cols-3 gap-6">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>
              
              <div className="flex items-center gap-4">
                <Button size="lg" className="apple-button">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button variant="outline" size="lg" className="border-border">
                  Learn More
                </Button>
              </div>
            </div>
            
            <div className="relative">
              <div className="apple-card rounded-2xl p-8">
                <div className="aspect-video bg-muted/30 rounded-xl flex items-center justify-center border border-border">
                  <Video className="h-16 w-16 text-muted-foreground" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Live Sessions Features
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Experience real-time trading education with professional traders and interactive learning.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="apple-card group h-full">
                <CardHeader className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center border border-border group-hover:feature-accent-purple transition-colors duration-300">
                      <feature.icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-semibold text-foreground">
                        {feature.title}
                      </CardTitle>
                    </div>
                  </div>
                  <CardDescription className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  {/* Usage */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-foreground">How it works:</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feature.usage}
                    </p>
                  </div>

                  {/* Features list */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-foreground">Key Features:</h4>
                    <div className="space-y-2">
                      {feature.features.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <CheckCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm text-muted-foreground">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Benefits */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-foreground">Benefits:</h4>
                    <div className="space-y-2">
                      {feature.benefits.map((benefit, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <div className="w-1.5 h-1.5 rounded-full feature-accent-purple" />
                          <span className="text-sm text-muted-foreground">{benefit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <Button className="w-full apple-button mt-4">
                    Learn More
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 monochrome-gradient">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted/50 border border-border mb-8">
            <Video className="h-8 w-8 text-muted-foreground" />
          </div>
          
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Join Live Trading Sessions
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Learn from the best by watching professional traders in action every day.
          </p>
          
          <div className="flex items-center justify-center gap-4">
            <Button size="lg" className="apple-button px-8">
              Join Live Sessions
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button variant="outline" size="lg" className="px-8 border-border">
              Contact Sales
            </Button>
          </div>
          
          <div className="mt-8 flex items-center justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Free 14-day trial
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              No credit card required
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              24/7 support
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LiveSessionsPage;