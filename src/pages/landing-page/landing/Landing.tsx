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
} from 'lucide-react';
import ContentSection from '@/components/landing/ContentSection';
import AnimatedCounter from '@/components/landing/AnimatedCounter';
import ToolsCarousel from '@/components/landing/ToolsCarousel';

export default function Landing() {
  const features = [
    {
      icon: BookOpen,
      title: "Premium Education",
      description: "Master trading with 20+ professional video courses. From basic chart reading to advanced institutional strategies used by hedge funds. Our curriculum covers technical analysis, fundamental analysis, risk management, and trading psychology - everything you need to trade like a pro.",
      detailedContext: "Transform from beginner to expert trader through our comprehensive education system. Learn from real market professionals who've traded millions in volume.",
      link: "education",
      videoSrc: "https://videos.pexels.com/video-files/8617545/8617545-hd_1920_1080_30fps.mp4"
    },
    {
      icon: TrendingUp,
      title: "Live FX Signals",
      description: "Access real-time forex trading signals with precise entry points, stop losses, and take profit levels. Our professional analysts monitor major currency pairs 24/5, delivering high-probability setups directly to your dashboard with live price tracking and instant notifications.",
      detailedContext: "Never miss a profitable opportunity with our round-the-clock signal service. Get detailed market analysis, risk management guidance, and trade updates in real-time.",
      link: "signals",
      videoSrc: "https://videos.pexels.com/video-files/6802049/6802049-hd_1920_1080_25fps.mp4"
    },
    {
      icon: Radio,
      title: "Live Trading Sessions",
      description: "Join daily live trading sessions where expert traders analyze markets in real-time, execute trades, and explain their decision-making process. Watch professionals manage risk, time entries, and capitalize on market opportunities as they happen.",
      detailedContext: "Experience the thrill of live trading alongside seasoned professionals. See exactly how experts read market sentiment, identify setups, and manage their positions.",
      link: "live-sessions",
      videoSrc: "https://videos.pexels.com/video-files/3142620/3142620-hd_1920_1080_25fps.mp4"
    },
    {
      icon: MessageSquare,
      title: "Elite Community Forum",
      description: "Connect with 500+ serious traders in our exclusive community. Share trade ideas, get feedback on your analysis, and learn from collective wisdom. Our forum features dedicated channels for different asset classes, strategy discussions, and market updates.",
      detailedContext: "Join a network of dedicated traders who share your passion for the markets. Collaborate, learn, and grow together in a supportive environment free from noise.",
      link: "community-forum",
      videoSrc: "https://videos.pexels.com/video-files/3205394/3205394-hd_1920_1080_25fps.mp4"
    },
    {
      icon: Briefcase,
      title: "IB Partnership Program",
      description: "Build a profitable business as an Introducing Broker with VT Markets. Earn up to $20 per lot in rebates through our 6-tier progression system. Access luxury rewards including Asia retreats, cruises, and exclusive Imperial Gold recognition for top performers.",
      detailedContext: "Transform your trading knowledge into a thriving business. Our IB program offers industry-leading compensation and comprehensive support to help you succeed.",
      link: "ib-partnership",
      videoSrc: "https://videos.pexels.com/video-files/5668767/5668767-hd_1920_1080_25fps.mp4"
    }
  ];

  const [activeFeatureIndex, setActiveFeatureIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveFeatureIndex(prevIndex => (prevIndex + 1) % features.length);
    }, 7000); // Change feature every 7 seconds
    return () => clearInterval(timer);
  }, [features.length]);

  const activeFeature = features[activeFeatureIndex];

  return (
    <div className="bg-background text-foreground w-full overflow-x-hidden">
      {/* Full Screen Video Background */}
      <div className="fixed inset-0 w-screen h-screen overflow-hidden z-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
          style={{ filter: 'brightness(0.4)' }}
        >
          <source src="https://videos.pexels.com/video-files/3209828/3209828-hd_1920_1080_25fps.mp4" type="video/mp4" />
          <source src="https://videos.pexels.com/video-files/7578540/7578540-hd_1920_1080_25fps.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
      </div>

      {/* Hero Section */}
      <section className="relative h-screen flex flex-col items-center justify-start text-center pt-24 sm:pt-32 overflow-x-hidden">
        <ContentSection>
          <div className="relative flex justify-center mb-8 z-10">
            <div className="w-24 h-24 bg-card/90 backdrop-blur-md rounded-3xl flex items-center justify-center shadow-2xl">
              <Crown className="w-16 h-16 text-primary" />
            </div>
          </div>
          
          <h1 className="text-6xl lg:text-8xl font-black mb-4 uppercase text-white relative z-10">
            <span className="imperial-tech-font">IMPERIAL</span>
          </h1>
          <p className="text-xl lg:text-2xl text-white mb-10 max-w-3xl mx-auto relative z-10 px-4">
            Ascend to the Apex of Trading.
            <br />
            Premium Education, Live Mentorship, and Professional Partnership Programs.
          </p>
        </ContentSection>
        
        {/* Scroll Down Indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10">
          <div className="text-lg text-white/80">Scroll to begin your journey.</div>
          <div className="animate-bounce mt-4 flex justify-center">
              <ChevronDown className="w-8 h-8 text-white/80" />
          </div>
        </div>
      </section>

      {/* Stats Intro with Animated Counters - Full Edge-to-Edge */}
      <section className="w-full bg-card py-20 z-10 relative overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <ContentSection>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
              {[
                { icon: Users, label: "Active Members", value: "200", suffix: "+", color: "text-green-400" },
                { icon: TrendingUp, label: "Productivity Rate", value: "80", suffix: "%", color: "text-blue-400" },
                { icon: BookOpen, label: "Educational Videos", value: "50", suffix: "+", color: "text-yellow-400" },
                { icon: Award, label: "IB Rebate up to", value: "20", suffix: "/lot", color: "text-red-400" },
              ].map(stat => (
                <div key={stat.label}>
                  <stat.icon className={`w-10 h-10 ${stat.color} mx-auto mb-3`} />
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                  <div className="text-sm text-muted-foreground uppercase tracking-widest">{stat.label}</div>
                </div>
              ))}
            </div>
          </ContentSection>
        </div>
      </section>

      {/* Netflix-style Feature Carousel - Full Edge-to-Edge */}
      <section className="w-full bg-background py-24 z-10 relative overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <ContentSection>
            <div className="text-center mb-12">
              <h2 className="text-4xl lg:text-5xl font-bold text-foreground mb-4">Your Path to <span className="white-gold-gradient">Trading Mastery</span></h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                A complete ecosystem of tools, education, and community support, seamlessly integrated.
              </p>
            </div>
          </ContentSection>
          <ContentSection>
            <div className="relative w-full aspect-video lg:aspect-[2/1] rounded-2xl overflow-hidden bg-card/20 backdrop-blur-sm border border-border">
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
                    <div className="w-16 h-16 bg-card/80 rounded-2xl flex items-center justify-center mb-6 shadow-2xl">
                      <activeFeature.icon className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">{activeFeature.title}</h3>
                    <p className="text-lg text-muted-foreground mb-6">{activeFeature.description}</p>
                    <p className="text-base text-muted-foreground/80 italic mb-8">{activeFeature.detailedContext}</p>
                    <Link to={createPageUrl(activeFeature.link)}>
                      <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-3 rounded-xl transition-all duration-300 transform hover:scale-105">
                        Explore {activeFeature.title}
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </ContentSection>
        </div>
      </section>

      {/* Apple-style Advanced Tools Showcase - Full Edge-to-Edge */}
      <section className="relative w-full bg-card py-12 overflow-hidden z-10">
        <video
          autoPlay loop muted playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-10"
          src="https://videos.pexels.com/video-files/3214439/3214439-hd_1920_1080_25fps.mp4"
        />
        <div className="relative max-w-7xl mx-auto px-6 lg:px-12">
          <ContentSection className="text-center mb-8">
            <h2 className="text-4xl lg:text-5xl font-bold text-foreground mb-4">
              An Arsenal of <span className="white-gold-gradient">Professional Tools</span>
            </h2>
            <p className="text-xl text-muted-foreground">
              Engineered for performance, powered by AI. Your trading, elevated.
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

      {/* Final CTA - Full Edge-to-Edge */}
      <section className="w-full bg-background py-24 text-center z-10 relative overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <ContentSection>
            <h2 className="text-4xl lg:text-5xl font-bold text-foreground mb-6">
              Ready to Join the <span className="white-gold-gradient">Elite?</span>
            </h2>
            <p className="text-xl text-muted-foreground mb-10">
              Your journey to trading mastery and professional partnership begins now.
              Take the definitive step towards your financial ambitions.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to={createPageUrl("account-request")}>
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-10 py-4 rounded-xl transition-all duration-300 transform hover:scale-105">
                  Become a Member
                </Button>
              </Link>
            </div>
          </ContentSection>
        </div>
      </section>
    </div>
  );
}