
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, TrendingUp, Users, BookOpen, Video, Target, Award, BarChart3, ChevronDown } from 'lucide-react';

const Home = () => {
  const features = [
    {
      icon: TrendingUp,
      title: "Live Trading Signals",
      description: "Real-time market signals from professional traders",
      gradient: "from-green-500/20 to-emerald-500/20",
      border: "border-green-500/30"
    },
    {
      icon: BookOpen,
      title: "Premium Education",
      description: "Comprehensive trading courses and resources",
      gradient: "from-blue-500/20 to-cyan-500/20",
      border: "border-blue-500/30"
    },
    {
      icon: Video,
      title: "Live Mentorship",
      description: "Interactive sessions with expert traders",
      gradient: "from-purple-500/20 to-violet-500/20",
      border: "border-purple-500/30"
    },
    {
      icon: Users,
      title: "Trading Community",
      description: "Connect with fellow traders worldwide",
      gradient: "from-orange-500/20 to-red-500/20",
      border: "border-orange-500/30"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative px-6 py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-amber-300/10" />
        
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center mb-6">
            <div className="p-4 rounded-full bg-gradient-to-r from-primary to-amber-300">
              <Crown className="h-12 w-12 text-background" />
            </div>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary via-amber-300 to-primary bg-clip-text text-transparent tracking-tight">
            IMPERIAL
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-4 font-light">
            Ascend to the Apex of Trading.
          </p>
          
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            Premium Education, Live Mentorship, and Professional Partnership Programs.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button size="lg" className="bg-gradient-to-r from-primary to-amber-300 hover:from-primary/90 hover:to-amber-300/90 text-background font-semibold px-8 py-3">
              Start Your Journey
            </Button>
            <Button size="lg" variant="outline" className="border-primary text-primary hover:bg-primary/10 px-8 py-3">
              View Live Signals
            </Button>
          </div>
          
          <div className="flex items-center justify-center text-muted-foreground animate-bounce">
            <span className="text-sm mr-2">Scroll to begin your journey</span>
            <ChevronDown className="h-4 w-4" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-amber-300 bg-clip-text text-transparent">
              Premium Trading Features
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to succeed in the financial markets, backed by professional expertise.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card 
                key={index} 
                className={`group hover:scale-[1.02] transition-all duration-300 border ${feature.border} bg-gradient-to-br ${feature.gradient} backdrop-blur-sm hover:shadow-xl hover:shadow-primary/10`}
              >
                <CardHeader>
                  <feature.icon className="h-10 w-10 text-primary mb-3 group-hover:scale-110 transition-transform duration-300" />
                  <CardTitle className="text-lg font-semibold">{feature.title}</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
