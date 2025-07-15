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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const IBPartnershipPage: React.FC = () => {
  const features = [
    {
      icon: Building,
      title: "Tier-1 Broker Network",
      description: "Access to top-tier institutional brokers with competitive spreads and execution.",
      features: ["Prime Brokers", "Institutional Rates", "Direct Market Access", "Low Latency"],
      usage: "Partner with tier-1 institutional brokers offering the best execution and competitive spreads for your clients.",
      benefits: ["Top-tier execution", "Competitive rates", "Institutional access"]
    },
    {
      icon: DollarSign,
      title: "Revenue Sharing",
      description: "Attractive revenue sharing programs with transparent commission structures.",
      features: ["Competitive Rates", "Performance Bonuses", "Transparent Structure", "Monthly Payouts"],
      usage: "Earn attractive commissions with our transparent revenue sharing model and performance-based bonuses.",
      benefits: ["High commissions", "Performance bonuses", "Transparent payments"]
    },
    {
      icon: Globe,
      title: "Global Reach",
      description: "Expand internationally with partners in major financial centers worldwide.",
      features: ["Global Network", "Multi-jurisdiction", "Local Support", "Regulatory Compliance"],
      usage: "Access global markets through our worldwide network of regulated partners in major financial centers.",
      benefits: ["Global expansion", "Local expertise", "Regulatory support"]
    },
    {
      icon: Zap,
      title: "Technology Integration",
      description: "Seamless integration with APIs, white-label solutions, and custom platforms.",
      features: ["API Access", "White Label Solutions", "Custom Integration", "Technical Support"],
      usage: "Integrate our technology seamlessly with comprehensive APIs and white-label solutions.",
      benefits: ["Easy integration", "Custom solutions", "Technical support"]
    },
    {
      icon: Briefcase,
      title: "Business Development",
      description: "Comprehensive business development support with marketing resources and training.",
      features: ["Marketing Materials", "Business Training", "Lead Generation", "Brand Support"],
      usage: "Receive comprehensive business development support including marketing materials and lead generation assistance.",
      benefits: ["Marketing support", "Business training", "Lead generation"]
    },
    {
      icon: Headphones,
      title: "Dedicated Support",
      description: "24/7 dedicated account management and technical support for all partners.",
      features: ["Account Manager", "24/7 Support", "Priority Service", "Technical Assistance"],
      usage: "Get dedicated support from experienced account managers with 24/7 technical assistance.",
      benefits: ["Dedicated support", "24/7 availability", "Priority service"]
    }
  ];

  const stats = [
    { value: "50+", label: "Partner Brokers" },
    { value: "$2M+", label: "Monthly Commissions" },
    { value: "24/7", label: "Support" }
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
                  <Handshake className="h-4 w-4" />
                  Institutional Partnerships
                </Badge>
                <h1 className="text-5xl font-bold text-foreground leading-tight tracking-tight">
                  IB Partnership Program
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  Partner with leading institutional brokers to grow your business through our comprehensive introducing broker program.
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
                  <Handshake className="h-16 w-16 text-muted-foreground" />
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
              IB Partnership Features
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Grow your business with our comprehensive institutional partnership program and dedicated support.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="apple-card group h-full">
                <CardHeader className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center border border-border group-hover:feature-accent-red transition-colors duration-300">
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
                          <div className="w-1.5 h-1.5 rounded-full feature-accent-red" />
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
            <Handshake className="h-8 w-8 text-muted-foreground" />
          </div>
          
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Become an IB Partner
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join our institutional partnership program and grow your business with industry-leading support.
          </p>
          
          <div className="flex items-center justify-center gap-4">
            <Button size="lg" className="apple-button px-8">
              Apply for Partnership
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

export default IBPartnershipPage;