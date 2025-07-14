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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const CommunityForumPage: React.FC = () => {
  const features = [
    {
      icon: MessageCircle,
      title: "Discussion Forums",
      description: "Active discussion boards covering all aspects of trading and market analysis.",
      features: ["Topic Categories", "Expert Moderation", "Real-time Discussions", "Search Function"],
      usage: "Participate in discussions across multiple categories including strategies, market analysis, and trading psychology.",
      benefits: ["Active discussions", "Expert moderation", "Knowledge sharing"]
    },
    {
      icon: Share2,
      title: "Strategy Sharing",
      description: "Share and discover trading strategies with detailed performance tracking.",
      features: ["Strategy Library", "Performance Data", "Peer Review", "Implementation Guides"],
      usage: "Share your successful strategies and learn from others with verified performance data and peer reviews.",
      benefits: ["Strategy discovery", "Performance tracking", "Peer validation"]
    },
    {
      icon: Star,
      title: "Expert Network",
      description: "Connect with verified expert traders and industry professionals.",
      features: ["Verified Experts", "Professional Insights", "Direct Access", "Mentorship Programs"],
      usage: "Get insights from verified expert traders and participate in mentorship programs.",
      benefits: ["Expert access", "Professional insights", "Mentorship opportunities"]
    },
    {
      icon: Heart,
      title: "Support Network",
      description: "Find support and motivation from fellow traders on your trading journey.",
      features: ["Peer Support", "Success Stories", "Challenge Groups", "Accountability Partners"],
      usage: "Connect with fellow traders for support, motivation, and accountability in your trading journey.",
      benefits: ["Peer support", "Motivation", "Accountability"]
    },
    {
      icon: Layers,
      title: "Resource Library",
      description: "Access thousands of trading resources shared by the community.",
      features: ["Resource Sharing", "Tool Reviews", "Book Recommendations", "Educational Content"],
      usage: "Access a vast library of trading resources including tools, books, and educational content shared by members.",
      benefits: ["Resource access", "Community knowledge", "Learning materials"]
    },
    {
      icon: UserCheck,
      title: "Verified Traders",
      description: "Follow verified traders who share their real trading performance.",
      features: ["Performance Verification", "Real Results", "Transparency", "Copy Trading"],
      usage: "Follow verified traders who share their real performance data with complete transparency.",
      benefits: ["Verified performance", "Transparency", "Learning opportunities"]
    }
  ];

  const stats = [
    { value: "50k+", label: "Active Members" },
    { value: "1k+", label: "Daily Posts" },
    { value: "24/7", label: "Community Support" }
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
                  <Users className="h-4 w-4" />
                  Global Trading Community
                </Badge>
                <h1 className="text-5xl font-bold text-foreground leading-tight tracking-tight">
                  Trading Community
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  Connect with traders worldwide, share strategies, and learn from a vibrant community of professionals and enthusiasts.
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
                  <Users className="h-16 w-16 text-muted-foreground" />
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
              Community Features
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Connect, learn, and grow with our vibrant trading community of 50,000+ active members.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="apple-card group h-full">
                <CardHeader className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center border border-border group-hover:feature-accent-pink transition-colors duration-300">
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
                          <div className="w-1.5 h-1.5 rounded-full feature-accent-pink" />
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
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Join Our Trading Community
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Connect with 50,000+ traders and accelerate your learning through community engagement.
          </p>
          
          <div className="flex items-center justify-center gap-4">
            <Button size="lg" className="apple-button px-8">
              Join Community
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

export default CommunityForumPage;