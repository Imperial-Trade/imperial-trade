import React from "react";
import {
  Bell,
  Activity,
  Brain,
  Target,
  LineChart,
  Clock,
  ArrowRight,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const SignalsPage: React.FC = () => {
  const features = [
    {
      icon: Bell,
      title: "Live Trading Alerts",
      description: "Real-time trading signals with precise entry, exit, and stop-loss levels.",
      features: ["Real-time Alerts", "Entry/Exit Levels", "Risk Management", "Multi-Asset Coverage"],
      usage: "Receive instant notifications for high-probability trading opportunities across forex, stocks, and crypto.",
      benefits: ["73% win rate", "Instant notifications", "Multi-asset coverage"]
    },
    {
      icon: Activity,
      title: "Signal Performance",
      description: "Detailed performance tracking with historical data and analytics.",
      features: ["Win Rate Tracking", "Performance Metrics", "Historical Data", "ROI Analysis"],
      usage: "Track the performance of every signal with detailed analytics and historical backtesting data.",
      benefits: ["Transparent results", "Performance tracking", "Historical analysis"]
    },
    {
      icon: Brain,
      title: "AI Analysis",
      description: "Machine learning algorithms process market data to identify trading opportunities.",
      features: ["Machine Learning", "Pattern Recognition", "Sentiment Analysis", "Big Data Processing"],
      usage: "Advanced AI analyzes millions of data points to identify high-probability trading setups.",
      benefits: ["AI-powered insights", "Pattern recognition", "Market analysis"]
    },
    {
      icon: Target,
      title: "Precision Targeting",
      description: "Highly accurate signals with specific entry and exit points.",
      features: ["Precise Levels", "Risk Parameters", "Probability Scores", "Market Context"],
      usage: "Get exact entry and exit levels with probability scores and risk parameters for each signal.",
      benefits: ["Precise targeting", "Risk management", "High accuracy"]
    },
    {
      icon: LineChart,
      title: "Market Analysis",
      description: "Daily market analysis and commentary from professional traders.",
      features: ["Daily Analysis", "Market Commentary", "Economic Calendar", "News Integration"],
      usage: "Receive professional market analysis and commentary every trading day with economic calendar integration.",
      benefits: ["Expert analysis", "Market insights", "Economic awareness"]
    },
    {
      icon: Clock,
      title: "Multi-Timeframe",
      description: "Signals for scalping, day trading, and swing trading strategies.",
      features: ["Scalping Signals", "Day Trading", "Swing Trading", "Position Trading"],
      usage: "Choose signals that match your trading style and time frame preferences.",
      benefits: ["Style flexibility", "Time frame options", "Strategy alignment"]
    }
  ];

  const stats = [
    { value: "73%", label: "Win Rate" },
    { value: "2.4:1", label: "Risk/Reward" },
    { value: "24/7", label: "Monitoring" }
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
                  <Bell className="h-4 w-4" />
                  AI-Powered Trading Signals
                </Badge>
                <h1 className="text-5xl font-bold text-foreground leading-tight tracking-tight">
                  Trading Signals
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  Machine learning algorithms analyze market data 24/7 to deliver high-probability trading opportunities directly to your device.
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
                  <Bell className="h-16 w-16 text-muted-foreground" />
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
              Signals Features
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Discover our comprehensive signal features powered by advanced AI and machine learning.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="apple-card group h-full">
                <CardHeader className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center border border-border group-hover:feature-accent-green transition-colors duration-300">
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
                          <div className="w-1.5 h-1.5 rounded-full feature-accent-green" />
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
            <Bell className="h-8 w-8 text-muted-foreground" />
          </div>
          
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Start Receiving Profitable Signals
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of traders using our AI-powered signals to improve their results.
          </p>
          
          <div className="flex items-center justify-center gap-4">
            <Button size="lg" className="apple-button px-8">
              Get Signals Now
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

export default SignalsPage;