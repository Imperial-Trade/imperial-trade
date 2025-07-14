import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  Crown,
  BookOpen,
  Radio,
  MessageSquare,
  Briefcase,
  Users,
  TrendingUp,
  Award,
  ChevronDown,
  Play,
  Brain,
  Search,
  Calculator,
  BarChart,
  Activity,
  Shield,
  CheckCircle,
  Star,
} from 'lucide-react';
import ContentSection from '@/components/landing/ContentSection';
import AnimatedCounter from '@/components/landing/AnimatedCounter';
import ToolsCarousel from '@/components/landing/ToolsCarousel';
import { useAuth } from '@/contexts/AuthContext';

export default function Landing() {
  const { user, loading } = useAuth();
  
  const features = [
    {
      icon: BookOpen,
      title: "AI-Powered Education",
      description: "Learn from personalized trading courses powered by artificial intelligence.",
      details: "Master trading with 50+ courses tailored to your skill level and trading style.",
      link: "education",
      color: "hsl(var(--feature-purple))",
      gradient: "from-purple-500 to-blue-500",
      videoSrc: "https://videos.pexels.com/video-files/8617545/8617545-hd_1920_1080_30fps.mp4"
    },
    {
      icon: TrendingUp,
      title: "Smart Signals",
      description: "Get real-time trading signals with 92% accuracy powered by machine learning.",
      details: "Never miss a profitable trade with our AI-driven signal detection system.",
      link: "signals",
      color: "hsl(var(--feature-blue))",
      gradient: "from-blue-500 to-cyan-500",
      videoSrc: "https://videos.pexels.com/video-files/6802049/6802049-hd_1920_1080_25fps.mp4"
    },
    {
      icon: Radio,
      title: "Live Trading",
      description: "Join live trading sessions with professional traders and learn in real-time.",
      details: "Watch experts trade live and copy their strategies in real-time.",
      link: "live-sessions",
      color: "hsl(var(--feature-green))",
      gradient: "from-green-500 to-emerald-500",
      videoSrc: "https://videos.pexels.com/video-files/3142620/3142620-hd_1920_1080_25fps.mp4"
    },
    {
      icon: MessageSquare,
      title: "Community",
      description: "Connect with 10,000+ traders in our exclusive community forum.",
      details: "Share ideas, get feedback, and learn from successful traders worldwide.",
      link: "community-forum",
      color: "hsl(var(--feature-orange))",
      gradient: "from-orange-500 to-red-500",
      videoSrc: "https://videos.pexels.com/video-files/3205394/3205394-hd_1920_1080_25fps.mp4"
    },
    {
      icon: Briefcase,
      title: "Partnership",
      description: "Earn up to $20 per lot with our exclusive IB partnership program.",
      details: "Build a profitable business with industry-leading compensation and support.",
      link: "ib-partnership",
      color: "hsl(var(--feature-pink))",
      gradient: "from-pink-500 to-purple-500",
      videoSrc: "https://videos.pexels.com/video-files/5668767/5668767-hd_1920_1080_25fps.mp4"
    }
  ];

  const [activeFeatureIndex, setActiveFeatureIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveFeatureIndex(prevIndex => (prevIndex + 1) % features.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [features.length]);

  const activeFeature = features[activeFeatureIndex];

  const benefits = [
    { icon: Star, text: "AI-powered trading signals with 92% accuracy" },
    { icon: Shield, text: "Enterprise-grade security and protection" },
    { icon: Award, text: "Award-winning trading platform" },
    { icon: CheckCircle, text: "24/7 professional support" },
  ];

  return (
    <div className="bg-background w-full overflow-x-hidden">
      {/* Hero Section - Enhanced with Original Styling */}
      <section className="relative min-h-screen flex items-center justify-center text-center z-10 overflow-hidden sophisticated-bg-mesh">
        {/* Elegant white-black-grey gradient background with green hints */}
        <div className="absolute inset-0 elegant-bg-gradient opacity-90" />
        
        {/* Subtle green accent overlays */}
        <div className="absolute inset-0 bg-gradient-to-tr from-accentGreen-sage/5 via-transparent to-accentGreen-mint/3" />
        <div className="absolute inset-0 bg-gradient-to-bl from-transparent via-accentGreen-forest/2 to-transparent" />
        
        {/* Elegant floating elements with imperial colors and green accents */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-imperial-gold rounded-full" />
          <div className="absolute top-1/3 right-1/4 w-1 h-1 bg-accentGreen-sage rounded-full" />
          <div className="absolute bottom-1/3 left-1/3 w-1.5 h-1.5 bg-imperial-bronze rounded-full" />
          <div className="absolute top-1/2 right-1/3 w-1 h-1 bg-accentGreen-mint rounded-full" />
        </div>
        
        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
          <ContentSection>
            <div className="space-y-12 max-w-5xl mx-auto">
              {/* Enhanced Badge with Crown icon */}
              <div>
                <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-bgGradient-light/80 border border-bgGradient-medium text-gray-darkest text-sm font-medium backdrop-blur-xl">
                  <Crown className="w-4 h-4 text-imperial-gold" />
                  <span className="text-slate-600">Elite Trading Platform</span>
                  <div className="w-2 h-2 bg-accentGreen-sage rounded-full" />
                </div>
              </div>

              {/* Main headline with enhanced text */}
              <div className="space-y-4">
                <h1 className="text-5xl sm:text-6xl lg:text-8xl font-bold leading-none tracking-tight text-gray-darkest">
                  <span className="block">The Future of</span>
                  <span className="block white-gold-gradient">
                    Smart Trading
                  </span>
                </h1>
                
                <p className="text-xl lg:text-2xl text-gray-medium max-w-4xl mx-auto leading-relaxed font-light">
                  Ascend to the Apex of Trading with AI-powered analytics, real-time signals, 
                  and professional-grade tools designed for consistent profitability.
                </p>
              </div>

              {/* Enhanced CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-6 justify-center items-center pt-4">
                {!loading && (user ? <Link to="/dashboard/home">
                      <Button size="lg" className="group bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-10 py-5 text-lg rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl relative overflow-hidden">
                        <span className="relative z-10 flex items-center">
                          Access Dashboard
                          <ArrowRight className="ml-3 h-5 w-5 transition-transform group-hover:translate-x-1" />
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-blue-600/80 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />
                      </Button>
                    </Link> : <Link to={createPageUrl("account-request")}>
                      <Button size="lg" className="group bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-10 py-5 text-lg rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl relative overflow-hidden">
                        <span className="relative z-10 flex items-center">
                          Start Trading
                          <ArrowRight className="ml-3 h-5 w-5 transition-transform group-hover:translate-x-1" />
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-blue-600/80 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />
                      </Button>
                    </Link>)}

                <Button variant="outline" size="lg" className="group glass-effect border-2 border-border/30 text-foreground hover:bg-primary/10 font-semibold px-10 py-5 text-lg rounded-2xl transition-all duration-300 backdrop-blur-xl">
                  <Play className="mr-3 h-5 w-5 transition-transform group-hover:scale-110" />
                  <span>Watch Demo</span>
                </Button>
              </div>

              {/* Enhanced Social proof with animated counters */}
              <div className="pt-12">
                <div className="flex flex-wrap justify-center items-center gap-12 opacity-80">
                   <div className="text-center group">
                     <AnimatedCounter value="15" suffix="K+" />
                     <div className="text-sm sage-accent font-medium">Active Traders</div>
                   </div>
                   <div className="w-px h-10 bg-gradient-to-b from-transparent via-border to-transparent" />
                   <div className="text-center group">
                     <AnimatedCounter value="3.2" suffix="B" />
                     <div className="text-sm text-muted-foreground font-medium">Volume Traded</div>
                   </div>
                   <div className="w-px h-10 bg-gradient-to-b from-transparent via-border to-transparent" />
                   <div className="text-center group">
                     <AnimatedCounter value="95" suffix="%" />
                     <div className="text-sm mint-accent font-medium">Success Rate</div>
                   </div>
                </div>
              </div>
            </div>
          </ContentSection>
        </div>

        {/* Scroll Down Indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10">
          <div className="text-lg text-gray-medium/80">Scroll to begin your journey.</div>
          <div className="animate-bounce mt-4 flex justify-center">
              <ChevronDown className="w-8 h-8 text-gray-medium/80" />
          </div>
        </div>
      </section>

      {/* Stats Section with Enhanced Counters */}
      <section className="relative py-32 subtle-bg-gradient">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <ContentSection>
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                Trusted by Traders
                <span className="white-gold-gradient block">
                  Worldwide
                </span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Join thousands of successful traders who trust our platform for their trading needs.
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { icon: TrendingUp, label: "Trading Volume", value: "2.5", suffix: "B", description: "Processed monthly", color: "hsl(var(--feature-blue))" },
                { icon: Users, label: "Active Traders", value: "10", suffix: "K+", description: "Worldwide community", color: "hsl(var(--feature-purple))" },
                { icon: Shield, label: "Success Rate", value: "92", suffix: "%", description: "Average profitability", color: "hsl(var(--feature-green))" },
                { icon: Award, label: "Awards Won", value: "15", suffix: "+", description: "Industry recognition", color: "hsl(var(--feature-orange))" },
              ].map((stat, index) => (
                <div key={stat.label} className="text-center group">
                  <div className="relative mb-6">
                    <div 
                      className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4"
                      style={{ backgroundColor: stat.color + '20' }}
                    >
                      <stat.icon 
                        className="w-8 h-8" 
                        style={{ color: stat.color }}
                      />
                    </div>
                  </div>
                  
                  <div className="mb-2">
                    <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                  </div>
                  
                  <div className="text-sm font-semibold text-foreground mb-1">
                    {stat.label}
                  </div>
                  
                  <div className="text-xs sage-accent">
                    {stat.description}
                  </div>
                </div>
              ))}
            </div>
          </ContentSection>
        </div>
      </section>

      {/* Enhanced Feature Carousel with Netflix Style */}
      <section className="relative py-32 sophisticated-bg-mesh">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <ContentSection>
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                Everything You Need
                <span className="white-gold-gradient block">
                  In One Platform
                </span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                A complete trading ecosystem designed to help you succeed in the markets.
              </p>
            </div>

            <div className="relative w-full aspect-video lg:aspect-[2/1] rounded-2xl overflow-hidden glass-effect">
              {/* Background Videos */}
              {features.map((feature, index) => (
                <video
                  key={feature.videoSrc}
                  src={feature.videoSrc}
                  autoPlay loop muted playsInline
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${activeFeatureIndex === index ? 'opacity-20' : 'opacity-0'}`}
                />
              ))}

              {/* Content Overlay */}
              <div className="absolute inset-0 flex flex-col lg:flex-row">
                {/* Left Navigation */}
                <div className="w-full lg:w-1/3 bg-card/30 backdrop-blur-sm p-6 lg:p-8 flex flex-row lg:flex-col justify-start lg:flex-shrink overflow-x-auto lg:overflow-x-hidden">
                  {features.map((feature, index) => {
                    const Icon = feature.icon;
                    return (
                      <button
                        key={feature.title}
                        onClick={() => setActiveFeatureIndex(index)}
                        className={`relative w-full text-left p-4 rounded-lg transition-all duration-300 mb-2 flex-shrink-0 lg:flex-shrink ${activeFeatureIndex === index ? 'bg-primary/20' : 'hover:bg-card/50'}`}
                      >
                        <div className="flex items-center gap-4">
                          <Icon className={`w-6 h-6 transition-colors duration-300 ${activeFeatureIndex === index ? 'text-primary' : 'text-muted-foreground'}`} />
                          <span className={`font-semibold transition-colors duration-300 ${activeFeatureIndex === index ? 'text-foreground' : 'text-muted-foreground'}`}>{feature.title}</span>
                        </div>
                        {activeFeatureIndex === index && (
                          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-1 bg-primary rounded-t-full"></div>
                        )}
                      </button>
                    )
                  })}
                </div>

                {/* Right Content */}
                <div className="w-full lg:w-2/3 p-6 lg:p-12 flex flex-col justify-center">
                  <div key={activeFeature.title} className="animate-fade-in">
                    <div 
                      className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
                      style={{ backgroundColor: activeFeature.color + '20' }}
                    >
                      <activeFeature.icon 
                        className="w-10 h-10" 
                        style={{ color: activeFeature.color }}
                      />
                    </div>
                    <h3 className="text-2xl lg:text-3xl font-bold mb-4 white-gold-gradient">{activeFeature.title}</h3>
                    <p className="text-muted-foreground text-lg mb-6 leading-relaxed">{activeFeature.details}</p>
                    <Link to={createPageUrl(activeFeature.link)}>
                      <Button 
                        size="lg"
                        className="font-semibold px-6 py-3 rounded-xl transition-all duration-300 transform hover:scale-105"
                        style={{ 
                          background: `linear-gradient(135deg, ${activeFeature.color}, ${activeFeature.color}dd)`
                        }}
                      >
                        Explore {activeFeature.title}
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </ContentSection>
        </div>
      </section>

      {/* Enhanced Tools Showcase */}
      <section className="relative py-12 bg-background overflow-hidden z-10">
        <video
          autoPlay loop muted playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-10"
          src="https://videos.pexels.com/video-files/3214439/3214439-hd_1920_1080_25fps.mp4"
        />
        <div className="relative max-w-7xl mx-auto px-6 lg:px-12">
          <ContentSection className="text-center mb-8">
            <h2 className="text-4xl lg:text-5xl font-bold mb-4">
              Professional Trading
              <span className="white-gold-gradient block">
                Arsenal
              </span>
            </h2>
            <p className="text-xl text-muted-foreground">
              Everything you need to dominate the markets. Built by traders, for traders.
            </p>
          </ContentSection>

          <ToolsCarousel />

          <ContentSection className="text-center mt-8">
            <Link to={createPageUrl("advanced-tools")}>
              <Button size="lg" variant="outline" className="text-foreground border-border hover:bg-card hover:border-primary">
                Explore All Tools <ArrowRight className="w-4 h-4 ml-2"/>
              </Button>
            </Link>
          </ContentSection>
        </div>
      </section>

      {/* Enhanced Final CTA */}
      <section className="relative py-32 bg-primary text-primary-foreground">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-96 h-96 bg-primary-foreground rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-primary-foreground rounded-full blur-3xl" />
        </div>

        <div className="max-w-5xl mx-auto px-6 lg:px-8 relative z-10">
          <ContentSection>
            <div className="text-center space-y-12">
              <div className="space-y-8">
                <h2 className="text-4xl lg:text-7xl font-bold leading-tight">
                  Ready to Join the
                  <span className="white-gold-gradient block">
                    Elite?
                  </span>
                </h2>

                <p className="text-xl lg:text-2xl text-primary-foreground/80 max-w-3xl mx-auto leading-relaxed">
                  Your journey to trading mastery and professional partnership begins now.
                  Take the definitive step towards your financial ambitions.
                </p>
              </div>

              {/* Benefits Grid */}
              <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                {benefits.map((benefit, index) => (
                  <div 
                    key={benefit.text}
                    className="flex items-center gap-4 p-4 bg-card/20 backdrop-blur-xl rounded-2xl border border-border/30"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary-foreground/20 flex items-center justify-center flex-shrink-0">
                      <benefit.icon className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <span className="text-primary-foreground font-medium">{benefit.text}</span>
                  </div>
                ))}
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                {!loading && (
                  user ? (
                    <Link to="/dashboard/home">
                      <Button
                        size="lg"
                        className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 font-bold px-12 py-6 text-xl rounded-2xl transition-all duration-300 shadow-2xl"
                      >
                        Access Dashboard
                        <ArrowRight className="ml-3 h-6 w-6" />
                      </Button>
                    </Link>
                  ) : (
                    <Link to={createPageUrl("account-request")}>
                      <Button
                        size="lg"
                        className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 font-bold px-12 py-6 text-xl rounded-2xl transition-all duration-300 shadow-2xl"
                      >
                        Become a Member
                        <ArrowRight className="ml-3 h-6 w-6" />
                      </Button>
                    </Link>
                  )
                )}

                <Link to={createPageUrl("account-request-status")}>
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-2 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 font-semibold px-12 py-6 text-xl rounded-2xl transition-all duration-300 backdrop-blur-xl"
                  >
                    Check Status
                  </Button>
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="pt-16 space-y-6">
                <div className="flex justify-center items-center gap-8 text-sm text-primary-foreground/70">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    <span>Bank-grade security</span>
                  </div>
                  <div className="w-px h-4 bg-primary-foreground/30" />
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4" />
                    <span>Award-winning platform</span>
                  </div>
                  <div className="w-px h-4 bg-primary-foreground/30" />
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>24/7 support</span>
                  </div>
                </div>
                
                <p className="text-xs text-primary-foreground/60">
                  Trusted by over 15,000 professional traders worldwide
                </p>
              </div>
            </div>
          </ContentSection>
        </div>
      </section>
    </div>
  );
}