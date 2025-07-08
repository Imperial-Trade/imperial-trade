
import React from 'react';
import { Link } from 'react-router-dom';
import { Crown, TrendingUp, Users, BookOpen, Shield, Star, ArrowRight, Zap, Target, Award, Globe, BarChart3, MessageSquare, Video, Calendar, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const Landing: React.FC = () => {
  const features = [
    {
      icon: TrendingUp,
      title: "Live Trading Signals",
      description: "Real-time trading signals from verified professional traders with proven track records and performance transparency.",
      highlight: "95% Success Rate"
    },
    {
      icon: Users,
      title: "Elite Community",
      description: "Join 10,000+ active traders sharing strategies, insights, and market analysis in our exclusive member forum.",
      highlight: "10K+ Members"
    },
    {
      icon: BookOpen,
      title: "Comprehensive Education",
      description: "500+ premium video courses covering technical analysis, risk management, psychology, and advanced trading strategies.",
      highlight: "500+ Courses"
    },
    {
      icon: Video,
      title: "Live Market Sessions",
      description: "Daily live streaming sessions with expert analysis, market commentary, and real-time trading opportunities.",
      highlight: "Daily Sessions"
    },
    {
      icon: Zap,
      title: "AI-Powered Analysis",
      description: "Advanced AI tools including Athena for market analysis, opportunity scanning, and risk simulation.",
      highlight: "AI Assistant"
    },
    {
      icon: Shield,
      title: "Risk Management Tools",
      description: "Professional-grade risk calculators, position sizing tools, and portfolio management systems.",
      highlight: "Risk Control"
    },
    {
      icon: Target,
      title: "Trading Strategies",
      description: "Access proven trading strategies with backtesting results, entry/exit rules, and performance metrics.",
      highlight: "Proven Methods"
    },
    {
      icon: BarChart3,
      title: "Performance Tracking",
      description: "Comprehensive trading journal with AI feedback, performance analytics, and progress monitoring.",
      highlight: "Track Progress"
    },
    {
      icon: MessageSquare,
      title: "Expert Mentorship",
      description: "Direct access to professional traders for guidance, strategy review, and personalized coaching.",
      highlight: "1-on-1 Support"
    },
    {
      icon: Calendar,
      title: "Economic Calendar",
      description: "Stay informed with high-impact economic events, news alerts, and market-moving announcements.",
      highlight: "Market Events"
    },
    {
      icon: Bell,
      title: "Smart Alerts",
      description: "Customizable price alerts, breakout notifications, and opportunity signals delivered instantly.",
      highlight: "Real-time Alerts"
    },
    {
      icon: Award,
      title: "Certification Program",
      description: "Earn recognized trading certifications and advance through our structured learning pathways.",
      highlight: "Get Certified"
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-primary to-amber-300 rounded-2xl flex items-center justify-center">
              <Crown className="w-10 h-10 text-background" />
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-amber-300 bg-clip-text text-transparent">
              IMPERIAL
            </h1>
          </div>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join the elite trading community where professionals share insights, 
            strategies, and real-time market analysis to maximize your trading success.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/access-portal">
              <Button size="lg" className="bg-accent-green hover:bg-green-500 text-white px-8">
                Get Started <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/about">
              <Button size="lg" variant="outline" className="px-8">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-surface/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Complete Trading <span className="text-primary">Ecosystem</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Everything you need to become a successful trader, from education and signals 
              to community support and advanced tools - all in one platform.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card 
                key={index} 
                className="group hover:border-primary/50 transition-all duration-300 bg-card/50 backdrop-blur-sm"
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-primary mb-1">
                        {feature.highlight}
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-2 leading-tight">
                        {feature.title}
                      </h3>
                    </div>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Feature Highlights */}
          <div className="mt-16 grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Globe className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Global Access</h3>
              <p className="text-muted-foreground">
                Trade global markets with 24/7 support and worldwide community coverage.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Proven Results</h3>
              <p className="text-muted-foreground">
                Transparent performance tracking with verified results from our trading experts.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Cutting Edge</h3>
              <p className="text-muted-foreground">
                Latest AI technology and advanced tools to give you the competitive advantage.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-6">Ready to Join the Elite?</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Start your journey with Imperial Trading Community today.
          </p>
          
          <Link to="/access-portal">
            <Button size="lg" className="bg-accent-green hover:bg-green-500 text-white px-12">
              Join Now <Star className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border/50">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Crown className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-amber-300 bg-clip-text text-transparent">
              IMPERIAL
            </span>
          </div>
          <p className="text-muted-foreground">
            © 2024 Imperial Trading Community. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
