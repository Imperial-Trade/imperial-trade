import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  TrendingUp, 
  Video, 
  MessageCircle, 
  BarChart3, 
  Users, 
  Bot, 
  Shield,
  Zap,
  Target,
  Briefcase,
  Crown
} from 'lucide-react';
import ContentSection from '@/components/landing/ContentSection';

const featureCategories = [
  {
    title: "Education & Learning",
    description: "Comprehensive trading education from beginner to advanced levels",
    features: [
      {
        icon: BookOpen,
        title: "Interactive Learning Pathways",
        description: "Structured courses with video content, quizzes, and progress tracking. Learn at your own pace with our comprehensive curriculum.",
        benefits: ["Video tutorials", "Progress tracking", "Certificates", "Multiple difficulty levels"]
      },
      {
        icon: Target,
        title: "Trading Psychology",
        description: "Master your emotions and develop disciplined trading habits with our psychology-focused modules.",
        benefits: ["Mood tracking", "Confidence building", "Risk management", "Mental preparation"]
      }
    ]
  },
  {
    title: "Live Trading & Signals",
    description: "Real-time market insights and professional trading signals",
    features: [
      {
        icon: TrendingUp,
        title: "Signal Stream",
        description: "Receive high-probability trading alerts with entry points, stop losses, and multiple take-profit levels.",
        benefits: ["Real-time alerts", "Multiple TPs", "Risk analysis", "Performance tracking"]
      },
      {
        icon: Video,
        title: "Live Trading Sessions",
        description: "Join live trading sessions with professional traders and learn from real market analysis.",
        benefits: ["Live market analysis", "Interactive Q&A", "Recorded sessions", "Expert insights"]
      }
    ]
  },
  {
    title: "Community & Networking",
    description: "Connect with traders and share experiences",
    features: [
      {
        icon: MessageCircle,
        title: "Community Forum",
        description: "Engage with fellow traders, share strategies, and discuss market opportunities in our active community.",
        benefits: ["Discussion threads", "Strategy sharing", "Market analysis", "Peer support"]
      },
      {
        icon: Users,
        title: "IB Partnership Program",
        description: "Become an Introducing Broker and earn commissions while helping others start their trading journey.",
        benefits: ["Commission structure", "Marketing support", "Training materials", "Performance tracking"]
      }
    ]
  },
  {
    title: "Advanced Tools & Analytics",
    description: "Professional-grade trading tools and market analysis",
    features: [
      {
        icon: BarChart3,
        title: "Advanced Trading Tools",
        description: "Access professional trading calculators, risk management tools, and market analysis utilities.",
        benefits: ["Risk calculator", "Position sizing", "Economic calendar", "Market screeners"]
      },
      {
        icon: Bot,
        title: "Athena AI Assistant",
        description: "Our AI-powered trading assistant provides personalized insights and answers your trading questions.",
        benefits: ["24/7 availability", "Personalized advice", "Market analysis", "Learning support"]
      }
    ]
  },
  {
    title: "Portfolio & Progress",
    description: "Track your trading performance and portfolio growth",
    features: [
      {
        icon: Briefcase,
        title: "Portfolio Management",
        description: "Monitor your investments and track portfolio performance across multiple asset classes.",
        benefits: ["Multi-asset tracking", "Performance metrics", "Risk analysis", "Profit/Loss tracking"]
      },
      {
        icon: Zap,
        title: "Progress Tracking",
        description: "Monitor your learning progress and trading performance with detailed analytics and insights.",
        benefits: ["Learning progress", "Performance analytics", "Achievement badges", "Goal setting"]
      }
    ]
  }
];

export default function Features() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <ContentSection className="py-24 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Crown className="h-10 w-10 text-primary" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-amber-300 bg-clip-text text-transparent">
              IMPERIAL FEATURES
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-4xl mx-auto mb-8 leading-relaxed">
            Join the elite ranks of Imperial Trading Partners. Unlock premium commissions, exclusive resources, 
            and build your trading empire with our industry-leading platform features.
          </p>
          <Badge variant="secondary" className="text-sm px-4 py-2 bg-primary/10 text-primary border-primary/20">
            <Shield className="h-4 w-4 mr-2" />
            Professional Grade • Secure • Reliable
          </Badge>
        </div>
      </ContentSection>

      {/* Features Grid */}
      <ContentSection className="pb-24 px-4">
        <div className="max-w-7xl mx-auto space-y-20">
          {featureCategories.map((category, categoryIndex) => (
            <div key={categoryIndex} className="space-y-8">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-foreground mb-4">
                  {category.title}
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  {category.description}
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-8">
                {category.features.map((feature, featureIndex) => (
                  <Card key={featureIndex} className="bg-card border-border hover:border-primary/50 transition-colors group">
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                          <feature.icon className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-xl text-card-foreground">
                            {feature.title}
                          </CardTitle>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <CardDescription className="text-muted-foreground text-base leading-relaxed">
                        {feature.description}
                      </CardDescription>
                      
                      <div className="space-y-2">
                        <h4 className="font-semibold text-card-foreground text-sm">Key Benefits:</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {feature.benefits.map((benefit, benefitIndex) => (
                            <div key={benefitIndex} className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                              <span className="text-sm text-muted-foreground">{benefit}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ContentSection>

      {/* Call to Action */}
      <ContentSection className="pb-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-primary/10 to-amber-300/10 rounded-2xl p-12 border border-primary/20">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Ready to Start Your Trading Journey?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of traders who have elevated their trading with Imperial's 
              comprehensive platform. Access all features with a single membership.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="px-8 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors">
                Get Started Today
              </button>
              <button className="px-8 py-3 border border-border text-foreground rounded-lg font-semibold hover:bg-accent transition-colors">
                View Pricing
              </button>
            </div>
          </div>
        </div>
      </ContentSection>
    </div>
  );
}
