import React from "react";
import {
  Calculator,
  BarChart3,
  Search,
  FileText,
  Presentation,
  Shield,
  ArrowRight,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const AdvancedToolsPage: React.FC = () => {
  const features = [
    {
      icon: Calculator,
      title: "Risk Calculator",
      description: "Advanced position sizing calculator with real-time portfolio heat mapping and correlation analysis.",
      features: ["Position Sizing", "Risk/Reward Analysis", "Portfolio Heat Maps", "Correlation Matrix"],
      usage: "Calculate optimal position sizes based on your risk tolerance and account balance with real-time updates.",
      benefits: ["Reduce losses by 40%", "Optimize position sizing", "Real-time risk monitoring"]
    },
    {
      icon: FileText,
      title: "Trading Journal",
      description: "AI-powered trading journal with performance analytics and automated tax reporting.",
      features: ["AI Analysis", "Performance Metrics", "Tax Reporting", "Trade Screenshots"],
      usage: "Automatically track every trade with detailed analytics and receive AI-powered insights on your performance.",
      benefits: ["Improve win rate by 25%", "Automated reporting", "Performance insights"]
    },
    {
      icon: Search,
      title: "Market Scanner",
      description: "Real-time market scanning with custom filters for identifying trading opportunities.",
      features: ["Custom Filters", "Real-time Scanning", "Opportunity Alerts", "Backtesting"],
      usage: "Scan thousands of instruments in real-time with customizable criteria to find the best trading opportunities.",
      benefits: ["Find opportunities faster", "Custom alert system", "Backtesting capabilities"]
    },
    {
      icon: BarChart3,
      title: "Portfolio Analytics",
      description: "Institutional-grade portfolio analysis with advanced risk metrics and performance attribution.",
      features: ["Risk Metrics", "Performance Attribution", "Stress Testing", "Benchmark Comparison"],
      usage: "Analyze your portfolio with institutional-grade metrics including VaR, Sharpe ratio, and drawdown analysis.",
      benefits: ["Professional analytics", "Risk optimization", "Benchmark tracking"]
    },
    {
      icon: Presentation,
      title: "Technical Analysis Suite",
      description: "Advanced charting platform with 150+ indicators and pattern recognition.",
      features: ["150+ Indicators", "Pattern Recognition", "Custom Drawings", "Multi-timeframe Analysis"],
      usage: "Professional charting with advanced technical analysis tools and automated pattern recognition.",
      benefits: ["Professional charting", "Pattern alerts", "Custom indicators"]
    },
    {
      icon: Shield,
      title: "Risk Management",
      description: "Comprehensive risk management with real-time monitoring and automated alerts.",
      features: ["Real-time Monitoring", "Risk Alerts", "Stop Loss Management", "Exposure Limits"],
      usage: "Monitor and manage risk across all positions with real-time alerts and automated protection.",
      benefits: ["Automated protection", "Real-time alerts", "Risk optimization"]
    }
  ];

  const stats = [
    { value: "500k+", label: "Active Traders" },
    { value: "99.9%", label: "Uptime" },
    { value: "50ms", label: "Avg Response" }
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
                  <Calculator className="h-4 w-4" />
                  Professional Trading Analytics
                </Badge>
                <h1 className="text-5xl font-bold leading-tight tracking-tight">
                  <span className="white-gold-gradient">Advanced Trading Tools</span>
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  Institutional-grade tools designed for serious traders who demand precision, speed, and advanced functionality.
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
              <div className="apple-card rounded-2xl p-8 white-gold-bg">
                <div className="aspect-video bg-muted/30 rounded-xl flex items-center justify-center border white-gold-border">
                  <Calculator className="h-16 w-16 text-imperial-gold" />
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
            <h2 className="text-3xl font-bold mb-4">
              <span className="white-gold-gradient">Advanced Tools Features</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Discover the comprehensive features that make our platform the choice of professional traders worldwide.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="apple-card group h-full">
                <CardHeader className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center border border-border group-hover:feature-accent-blue transition-colors duration-300">
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
                          <div className="w-1.5 h-1.5 rounded-full feature-accent-blue" />
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
            <Calculator className="h-8 w-8 text-muted-foreground" />
          </div>
          
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Trade with Professional Tools
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Access the same tools used by institutional traders and hedge funds.
          </p>
          
          <div className="flex items-center justify-center gap-4">
            <Button size="lg" className="apple-button px-8">
              Start Free Trial
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

export default AdvancedToolsPage;