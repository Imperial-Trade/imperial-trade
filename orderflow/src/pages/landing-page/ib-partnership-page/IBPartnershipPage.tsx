import React from "react";
import {
  Handshake,
  Building,
  DollarSign,
  Globe,
  Zap,
  Briefcase,
  Headphones,
  ArrowRight,
  CheckCircle,
  Crown,
  TrendingUp,
  Target,
  Award,
  Users,
  BarChart3,
  Gift
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const IBPartnershipPage: React.FC = () => {
  const tierProgression = [
    {
      tier: "Hero",
      commission: "$6",
      requirements: "Getting Started",
      color: "from-gray-400 to-gray-600",
      description: "Your entry point into the Imperial Trade business ecosystem."
    },
    {
      tier: "Expert", 
      commission: "$9",
      requirements: "Building Momentum",
      color: "from-blue-400 to-blue-600",
      description: "Developing your client base and business foundation."
    },
    {
      tier: "Specialist",
      commission: "$12", 
      requirements: "Established Business",
      color: "from-green-400 to-green-600",
      description: "Advanced-level partnership with significant volume."
    },
    {
      tier: "Ambassador",
      commission: "$15",
      requirements: "Regional Leadership", 
      color: "from-purple-400 to-purple-600",
      description: "Leadership role with substantial market influence."
    },
    {
      tier: "Royal Ambassador",
      commission: "$18",
      requirements: "Elite Performance",
      color: "from-orange-400 to-orange-600", 
      description: "Elite-tier partnership with exceptional results."
    },
    {
      tier: "Imperial",
      commission: "$20",
      requirements: "Pinnacle Achievement",
      color: "from-amber-400 to-amber-600",
      description: "The highest honor - reserved for the most successful partners."
    }
  ];

  const businessFeatures = [
    {
      icon: BarChart3,
      title: "IB Dashboard Mission Control",
      subtitle: "Complete Business Intelligence",
      description: "Your comprehensive business management platform with real-time analytics and performance tracking.",
      features: [
        "Real-Time Client Analytics: Live tracking of every client linked to your IB account",
        "Volume Progress Monitoring: Visual progress bars showing monthly volume toward next tier",
        "Earnings Calculator: Real-time earnings estimates updated as clients trade",
        "Withdrawal Interface: Simple, transparent commission payout requests and tracking",
        "Performance Metrics: Detailed analytics on client activity and retention rates",
        "Growth Projections: Data-driven forecasts for business development planning"
      ],
      whatItDoes: "This isn't a simple spreadsheet - it's dynamic mission control showing your business health, client performance, and earnings trajectory in real-time.",
      gradient: "from-amber-500/20 to-orange-500/20"
    },
    {
      icon: Target,
      title: "Marketing & Onboarding Arsenal",
      subtitle: "Advanced Business Development",
      description: "Complete marketing ecosystem and client support infrastructure for business growth.",
      features: [
        "Personalized Referral Links: Unique tracking links automatically attributing new sign-ups",
        "Marketing Suite Library: Professional banners, social media templates, and email campaigns",
        "Client Onboarding Support: Materials to help clients understand and get value from the platform",
        "Brand Compliance Guidelines: Ensure your marketing maintains Imperial Trade standards",
        "Lead Generation Tools: Systems to help identify and convert potential clients",
        "Performance Optimization: A/B testing tools for marketing campaign effectiveness"
      ],
      whatItDoes: "We provide a complete marketing infrastructure so you can focus on building relationships while we handle the technical aspects of client acquisition and retention.",
      gradient: "from-blue-500/20 to-cyan-500/20"
    },
    {
      icon: Crown,
      title: "Imperial Gold Club",
      subtitle: "Exclusive Elite Rewards",
      description: "Reaching top tiers isn't just about money - it's about status, recognition, and exclusive experiences.",
      features: [
        "Company-Sponsored Luxury Retreats: All-expenses-paid trips to luxury destinations",
        "Exclusive Networking Events: Connect with other top performers and company leadership",
        "Luxury Cruise Invitations: Annual Imperial Gold member cruises and celebrations", 
        "Leaderboard Recognition: Public recognition as a top partner within the community",
        "VIP Support Priority: Dedicated account management and priority customer service",
        "Early Access Programs: First access to new products, features, and business opportunities"
      ],
      whatItDoes: "It's a complete lifestyle and status upgrade that celebrates your success and connects you with an elite network of high-achieving business partners.",
      gradient: "from-purple-500/20 to-indigo-500/20"
    }
  ];

  const businessBenefits = [
    {
      icon: TrendingUp,
      title: "Scalable Income Diversification",
      description: "Build a significant, recurring income stream independent of your personal trading performance.",
      benefits: ["Portfolio income diversification", "Scalable business model", "Passive income potential"]
    },
    {
      icon: Users,
      title: "Institutional Brand Leverage",
      description: "Leverage the Imperial Trade brand reputation and infrastructure for your business growth.",
      benefits: ["Established brand trust", "Advanced marketing materials", "Technical infrastructure"]
    },
    {
      icon: Award,
      title: "Career Development Path",
      description: "Not just referrals - a complete career advancement opportunity in financial services.",
      benefits: ["Advanced development", "Industry networking", "Leadership opportunities"]
    }
  ];

  const stats = [
    { value: "$20", label: "Max Commission per Lot", subtitle: "Imperial Tier" },
    { value: "6", label: "Tier Progression Levels", subtitle: "Clear Advancement Path" },
    { value: "24/7", label: "Business Support", subtitle: "Dedicated Account Management" }
  ];

  return (
    <div className="bg-background min-h-screen font-sans">
      {/* Hero Section */}
      <section className="relative py-24 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-amber-500/5" />
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center space-y-8">
            <div className="space-y-6">
              <Badge variant="outline" className="inline-flex items-center gap-2 border-amber-500/20 text-amber-600 bg-amber-500/5">
                <Crown className="h-4 w-4" />
                Your Trading Business Empire
              </Badge>
              <h1 className="text-6xl font-bold leading-tight tracking-tight">
                <span className="bg-gradient-to-r from-amber-500 via-orange-400 to-amber-600 bg-clip-text text-transparent">
                  IB Partnership
                </span>
                <br />
                <span className="text-foreground">Build Your Empire</span>
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed max-w-4xl mx-auto">
                A fully-fledged, turnkey business opportunity. Build a significant, recurring income stream by leveraging 
                the Imperial Trade brand and your personal network. This is not just a referral program - it's a career path.
              </p>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
              {stats.map((stat, index) => (
                <div key={index} className="text-center space-y-2">
                  <div className="text-3xl font-bold text-amber-600">{stat.value}</div>
                  <div className="text-sm font-medium text-foreground">{stat.label}</div>
                  <div className="text-xs text-muted-foreground">{stat.subtitle}</div>
                </div>
              ))}
            </div>
            
            <div className="flex items-center justify-center gap-4">
              <Button size="lg" className="bg-amber-600 hover:bg-amber-700 text-white px-8">
                Start Building Your Empire
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button variant="outline" size="lg" className="border-amber-500/20 hover:bg-amber-500/5 px-8">
                Learn About Tiers
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Tier Progression */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-orange-400 to-amber-600 bg-clip-text text-transparent">
                The 6-Tier Progression: A Ladder of Success
              </span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Clear, transparent progression based on monthly trading volume. You know exactly what you need to do to reach the next level.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tierProgression.map((tier, index) => (
              <Card key={index} className="group border-border/50 hover:border-amber-500/30 transition-all duration-300 overflow-hidden relative">
                <div className={`absolute inset-0 bg-gradient-to-br ${tier.color} opacity-5 group-hover:opacity-10 transition-opacity duration-500`} />
                {index === tierProgression.length - 1 && (
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-amber-600 text-white">
                      <Crown className="h-3 w-3 mr-1" />
                      ELITE
                    </Badge>
                  </div>
                )}
                <div className="relative">
                  <CardHeader className="text-center space-y-4">
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${tier.color} mx-auto`}>
                      <span className="text-2xl font-bold text-white">{index + 1}</span>
                    </div>
                    <div>
                      <CardTitle className="text-2xl text-foreground group-hover:text-amber-600 transition-colors">
                        {tier.tier}
                      </CardTitle>
                      <div className="text-sm font-medium text-amber-600 mt-1">
                        {tier.requirements}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="text-center space-y-4">
                    <div className="space-y-2">
                      <div className="text-4xl font-bold text-foreground">
                        {tier.commission}
                        <span className="text-base font-normal text-muted-foreground">/lot</span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {tier.description}
                      </p>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      className="w-full border-amber-500/20 hover:bg-amber-500/5 text-amber-600"
                    >
                      {index === 0 ? "Start Here" : `Reach ${tier.tier}`}
                    </Button>
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
          
          <div className="text-center mt-12">
            <Card className="inline-block border-amber-500/20 bg-amber-500/5">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <TrendingUp className="h-8 w-8 text-amber-600" />
                  <div className="text-left">
                    <div className="font-semibold text-foreground">Volume-Based Transparent Metrics</div>
                    <div className="text-sm text-muted-foreground">Your rank is determined by total monthly trading volume of your referred clients</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Business Features */}
      <section className="py-24 px-6 bg-gradient-to-br from-amber-500/5 to-background">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-orange-400 to-amber-600 bg-clip-text text-transparent">
                Complete Business Infrastructure
              </span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              We provide all the tools, systems, and support you need to build a successful partnership business.
            </p>
          </div>

          <div className="space-y-8">
            {businessFeatures.map((feature, index) => (
              <Card key={index} className="group border-border/50 hover:border-amber-500/30 transition-all duration-300 overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <div className="relative">
                  <CardHeader className="space-y-4">
                    <div className="flex items-start gap-6">
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 to-amber-500/5 group-hover:from-amber-500/20 group-hover:to-amber-500/10 transition-all duration-300">
                        <feature.icon className="h-8 w-8 text-amber-600" />
                      </div>
                      <div className="flex-1">
                        <div className="space-y-1">
                          <CardTitle className="text-2xl text-foreground group-hover:text-amber-600 transition-colors">
                            {feature.title}
                          </CardTitle>
                          <div className="text-sm font-medium text-amber-600">
                            {feature.subtitle}
                          </div>
                        </div>
                        <CardDescription className="text-muted-foreground mt-3 leading-relaxed">
                          {feature.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-6">
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide">What This Provides:</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed italic bg-muted/30 p-4 rounded-lg">
                        "{feature.whatItDoes}"
                      </p>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide">Key Features:</h4>
                      <div className="space-y-2">
                        {feature.features.slice(0, 4).map((item, idx) => (
                          <div key={idx} className="flex items-start gap-3 text-sm bg-muted/30 p-3 rounded-lg">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-600 mt-2 flex-shrink-0" />
                            <span className="text-muted-foreground leading-relaxed">{item}</span>
                          </div>
                        ))}
                        {feature.features.length > 4 && (
                          <div className="text-xs text-amber-600 font-medium pl-4">
                            +{feature.features.length - 4} more business tools
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

      {/* Business Benefits */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              What This Really Does For You
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              This provides a pathway to financial freedom that diversifies your income away from just your own trading P&L.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {businessBenefits.map((benefit, index) => (
              <Card key={index} className="text-center border-border/50 hover:border-amber-500/30 transition-all duration-300">
                <CardHeader className="space-y-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/10 to-amber-500/5 mx-auto">
                    <benefit.icon className="h-8 w-8 text-amber-600" />
                  </div>
                  <CardTitle className="text-xl text-foreground">
                    {benefit.title}
                  </CardTitle>
                  <CardDescription className="text-muted-foreground leading-relaxed">
                    {benefit.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-3">
                    {benefit.benefits.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 text-sm">
                        <CheckCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                        <span className="text-muted-foreground leading-relaxed">{item}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-background to-orange-400/5" />
        <div className="max-w-4xl mx-auto text-center relative">
          <div className="space-y-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/20">
              <Crown className="h-10 w-10 text-amber-600" />
            </div>
            
            <div className="space-y-4">
              <h2 className="text-4xl font-bold text-foreground">
                Build Your 
                <span className="bg-gradient-to-r from-amber-500 to-orange-400 bg-clip-text text-transparent"> Trading Empire</span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Join our elite IB partnership program and transform your trading knowledge into a scalable, long-term business asset.
              </p>
            </div>
            
            <div className="flex items-center justify-center gap-4">
              <Button size="lg" className="bg-amber-600 hover:bg-amber-700 text-white px-8">
                Apply for Partnership
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button variant="outline" size="lg" className="border-amber-500/20 hover:bg-amber-500/5 px-8">
                Download IB Guide
              </Button>
            </div>
            
            <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-amber-600" />
                No upfront costs
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-amber-600" />
                Complete business support
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-amber-600" />
                Elite rewards program
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default IBPartnershipPage;