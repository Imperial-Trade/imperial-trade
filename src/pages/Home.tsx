
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
  Brain,
  Search,
  Calculator,
  BarChart,
  Activity,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const ParallaxSection = ({ children, videoSrc, isFirst = false }) => {
  const bgRef = useRef(null);
  const [offsetY, setOffsetY] = useState(0);

  const handleScroll = () => {
    if (window.innerWidth > 768) {
      const scrollPosition = window.pageYOffset;
      const elementTop = bgRef.current?.parentElement.offsetTop || 0;
      const relativeScroll = scrollPosition - elementTop;
      setOffsetY(relativeScroll * 0.3);
    }
  };

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section className="parallax-container">
      {videoSrc && (
        <video
          autoPlay
          loop
          muted
          playsInline
          className="parallax-bg"
          style={{ objectFit: 'cover' }}
        >
          <source src={videoSrc} type="video/mp4" />
        </video>
      )}
      <div className="content-overlay">
        {children}
      </div>
    </section>
  );
};

const ContentSection = ({ children, className = '', style = {} }) => {
  const contentRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      },
      { threshold: 0.1 }
    );

    if (contentRef.current) {
      observer.observe(contentRef.current);
    }

    return () => {
      if (contentRef.current) {
        observer.unobserve(contentRef.current);
      }
    };
  }, []);

  return (
    <div ref={contentRef} className={`scroll-reveal ${className}`} style={style}>
      {children}
    </div>
  );
};

const AnimatedCounter = ({ value, duration = 3000, suffix = "" }) => {
  const [count, setCount] = useState(0);
  const counterRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Reset count and start animation every time section becomes visible
          setCount(0);
          
          // Extract numeric value from string (e.g., "10,000+" -> 10000)
          const numericValue = parseFloat(value.toString().replace(/[^0-9.]/g, ''));
          
          let startTime = null;
          const animate = (currentTime) => {
            if (!startTime) startTime = currentTime;
            const progress = Math.min((currentTime - startTime) / duration, 1);
            
            // Easing function for smooth animation
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const currentValue = Math.floor(easeOut * numericValue);
            
            setCount(currentValue);
            
            if (progress < 1) {
              requestAnimationFrame(animate);
            } else {
              setCount(numericValue);
            }
          };
          
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );

    if (counterRef.current) {
      observer.observe(counterRef.current);
    }

    return () => {
      if (counterRef.current) {
        observer.unobserve(counterRef.current);
      }
    };
  }, [value, duration]);

  const formatNumber = (num) => {
    if (num >= 1000) {
      return num.toLocaleString();
    }
    return num.toString();
  };

  return (
    <div ref={counterRef} className="text-3xl font-bold text-primary mb-1">
      {formatNumber(count)}{suffix}
    </div>
  );
};

const ToolsCarousel = () => {
  const tools = [
    { name: 'AI Analyst', icon: Brain, description: 'Get AI-powered breakdowns of your trade history, identify strengths, and pinpoint areas for improvement.', color: 'text-purple-400' },
    { name: 'AI Scanner', icon: Search, description: 'Scan markets 24/7 for high-probability setups across various assets. Never miss a potential trade again.', color: 'text-blue-400' },
    { name: 'Risk Calculator', icon: Calculator, description: 'Calculate the perfect position size in seconds. Manage your risk precisely for any instrument and trade.', color: 'text-green-400' },
    { name: 'Trading Journal', icon: BookOpen, description: 'Log trades and get AI-powered encouragement and constructive feedback to refine your strategy.', color: 'text-orange-400' },
    { name: 'Performance Analytics', icon: BarChart, description: 'Visualize your trading performance with in-depth charts, heatmaps, and customizable metrics.', color: 'text-pink-400' },
    { name: 'Risk Simulator', icon: Activity, description: 'Simulate trade setups to analyze risk before you enter the market, testing different scenarios.', color: 'text-red-400' },
  ];

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prevIndex) => (prevIndex + 1) % tools.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [tools.length]);

  return (
    <ContentSection>
      <div className="h-[320px] relative flex flex-col items-center justify-center">
        {/* Carousel Items */}
        <div className="relative w-full h-[280px]" style={{ perspective: '1500px' }}>
          {tools.map((tool, index) => {
            const offset = index - activeIndex;
            const sign = Math.sign(offset);
            const absOffset = Math.abs(offset);

            // Determine if the item is "behind" in the rotation for seamless looping
            const isBehind = Math.abs(offset) > tools.length / 2;
            const displayOffset = isBehind ? (tools.length - absOffset) * -sign : offset;

            const transform = {
              rotateY: displayOffset * -20, // Reduced rotation for better visibility
              translateX: displayOffset * 180, // Increased spacing to prevent overlap
              scale: absOffset === 0 ? 1.2 : 0.6, // Bigger center, smaller sides
              zIndex: tools.length - absOffset,
            };

            const opacity = absOffset <= 2 ? 1 : 0; // Only show active and two on each side
            const blur = absOffset === 0 ? 'blur(0)' : 'blur(3px)';

            // Different card sizes for center vs side items
            const cardWidth = absOffset === 0 ? 'w-[450px]' : 'w-80';
            const cardHeight = absOffset === 0 ? 'h-64' : 'h-48';
            const iconSize = absOffset === 0 ? 'w-16 h-16' : 'w-10 h-10';
            const titleSize = absOffset === 0 ? 'text-2xl' : 'text-lg';
            const descSize = absOffset === 0 ? 'text-base' : 'text-sm';
            const padding = absOffset === 0 ? 'p-8' : 'p-4';

            return (
              <div
                key={tool.name}
                className="absolute w-full h-full transition-all duration-700 ease-out"
                style={{
                  transform: `translateX(${transform.translateX}px) rotateY(${transform.rotateY}deg) scale(${transform.scale})`,
                  zIndex: transform.zIndex,
                  opacity: opacity,
                  filter: blur,
                  transformOrigin: 'center center',
                }}
              >
                <Card className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${cardWidth} ${cardHeight} text-center bg-background/50 border-default ${padding} rounded-2xl flex flex-col justify-center items-center`}>
                  <tool.icon className={`${iconSize} ${tool.color} mx-auto mb-4`}/>
                  <h3 className={`${titleSize} font-bold text-primary mb-3`}>{tool.name}</h3>
                  <p className={`text-secondary ${descSize} leading-relaxed`}>{tool.description}</p>
                </Card>
              </div>
            );
          })}
        </div>
        {/* Navigation Strip */}
        <div className="absolute -bottom-2 flex gap-3 items-center">
          {tools.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveIndex(index)}
              className={`transition-all duration-300 rounded-full ${activeIndex === index ? 'w-16 h-3 bg-accent-green' : 'w-3 h-3 bg-surface'}`}
              aria-label={`Go to tool ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </ContentSection>
  );
};


export default function Home() {
  const features = [
    {
      icon: BookOpen,
      title: "Premium Education",
      description: "Master trading with 20+ professional video courses. From basic chart reading to advanced institutional strategies used by hedge funds. Our curriculum covers technical analysis, fundamental analysis, risk management, and trading psychology - everything you need to trade like a pro.",
      detailedContext: "Transform from beginner to expert trader through our comprehensive education system. Learn from real market professionals who've traded millions in volume.",
      link: "Education",
      videoSrc: "https://videos.pexels.com/video-files/8617545/8617545-hd_1920_1080_30fps.mp4"
    },
    {
      icon: TrendingUp,
      title: "Live FX Signals",
      description: "Access real-time forex trading signals with precise entry points, stop losses, and take profit levels. Our professional analysts monitor major currency pairs 24/5, delivering high-probability setups directly to your dashboard with live price tracking and instant notifications.",
      detailedContext: "Never miss a profitable opportunity with our round-the-clock signal service. Get detailed market analysis, risk management guidance, and trade updates in real-time.",
      link: "SignalStream",
      videoSrc: "https://videos.pexels.com/video-files/6802049/6802049-hd_1920_1080_25fps.mp4"
    },
    {
      icon: Radio,
      title: "Live Trading Sessions",
      description: "Join daily live trading sessions where expert traders analyze markets in real-time, execute trades, and explain their decision-making process. Watch professionals manage risk, time entries, and capitalize on market opportunities as they happen.",
      detailedContext: "Experience the thrill of live trading alongside seasoned professionals. See exactly how experts read market sentiment, identify setups, and manage their positions.",
      link: "Live",
      videoSrc: "https://videos.pexels.com/video-files/3142620/3142620-hd_1920_1080_25fps.mp4"
    },
    {
      icon: MessageSquare,
      title: "Elite Community Forum",
      description: "Connect with 500+ serious traders in our exclusive community. Share trade ideas, get feedback on your analysis, and learn from collective wisdom. Our forum features dedicated channels for different asset classes, strategy discussions, and market updates.",
      detailedContext: "Join a network of dedicated traders who share your passion for the markets. Collaborate, learn, and grow together in a supportive environment free from noise.",
      link: "Forum",
      videoSrc: "https://videos.pexels.com/video-files/3205394/3205394-hd_1920_1080_25fps.mp4"
    },
    {
      icon: Briefcase,
      title: "IB Partnership Program",
      description: "Build a profitable business as an Introducing Broker with VT Markets. Earn up to $20 per lot in rebates through our 6-tier progression system. Access luxury rewards including Asia retreats, cruises, and exclusive Imperial Gold recognition for top performers.",
      detailedContext: "Transform your trading knowledge into a thriving business. Our IB program offers industry-leading compensation and comprehensive support to help you succeed.",
      link: "IBPartnership",
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
    <div className="bg-background text-primary w-full overflow-x-hidden">
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
            <div className="w-24 h-24 bg-surface/90 backdrop-blur-md rounded-3xl flex items-center justify-center glow-effect-gold shadow-2xl">
              <Crown className="w-16 h-16 text-accent-gold" />
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
      <section className="w-full bg-surface py-20 z-10 relative overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <ContentSection>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
              {[
                { icon: Users, label: "Active Members", value: "200", suffix: "+", color: "text-accent-green" },
                { icon: TrendingUp, label: "Productivity Rate", value: "80", suffix: "%", color: "text-accent-blue" },
                { icon: BookOpen, label: "Educational Videos", value: "50", suffix: "+", color: "text-accent-gold" },
                { icon: Award, label: "IB Rebate up to", value: "20", suffix: "/lot", color: "text-accent-red" },
              ].map(stat => (
                <div key={stat.label}>
                  <stat.icon className={`w-10 h-10 ${stat.color} mx-auto mb-3`} />
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                  <div className="text-sm text-secondary uppercase tracking-widest">{stat.label}</div>
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
              <h2 className="text-4xl lg:text-5xl font-bold text-primary mb-4">Your Path to <span className="gold-text-gradient">Trading Mastery</span></h2>
              <p className="text-xl text-secondary max-w-3xl mx-auto">
                A complete ecosystem of tools, education, and community support, seamlessly integrated.
              </p>
            </div>
          </ContentSection>
          <ContentSection>
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
                <div className="w-full lg:w-1/3 bg-surface/30 backdrop-blur-sm p-6 lg:p-8 flex flex-row lg:flex-col justify-start lg:flex-shrink overflow-x-auto lg:overflow-x-hidden">
                  {features.map((feature, index) => {
                    const Icon = feature.icon;
                    return (
                      <button
                        key={feature.title}
                        onClick={() => setActiveFeatureIndex(index)}
                        className={`relative w-full text-left p-4 rounded-lg transition-all duration-300 mb-2 flex-shrink-0 lg:flex-shrink ${activeFeatureIndex === index ? 'bg-accent-green/20' : 'hover:bg-surface/50'}`}
                      >
                        <div className="flex items-center gap-4">
                          <Icon className={`w-6 h-6 transition-colors duration-300 ${activeFeatureIndex === index ? 'text-accent-green' : 'text-secondary'}`} />
                          <span className={`font-semibold transition-colors duration-300 ${activeFeatureIndex === index ? 'text-primary' : 'text-secondary'}`}>{feature.title}</span>
                        </div>
                        {activeFeatureIndex === index && (
                          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-1 bg-accent-green rounded-t-full"></div>
                        )}
                      </button>
                    )
                  })}
                </div>

                {/* Right Content */}
                <div className="w-full lg:w-2/3 p-6 lg:p-12 flex flex-col justify-center">
                  <div key={activeFeature.title} className="animate-fade-in">
                    <div className="w-16 h-16 bg-surface/80 rounded-2xl flex items-center justify-center mb-6 glow-effect-green">
                      <activeFeature.icon className="w-8 h-8 text-accent-green" />
                    </div>
                    <h3 className="text-3xl lg:text-4xl font-bold text-primary mb-4">{activeFeature.title}</h3>
                    <p className="text-lg text-secondary mb-6">{activeFeature.description}</p>
                    <p className="text-base text-secondary/80 italic mb-8">{activeFeature.detailedContext}</p>
                    <Link to={createPageUrl(activeFeature.link)}>
                      <Button className="bg-accent-green hover:bg-green-500 text-white font-semibold px-8 py-3 rounded-xl transition-all duration-300 transform hover:scale-105 glow-effect-green">
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
      <section className="relative w-full bg-surface py-12 overflow-hidden z-10">
        <video
          autoPlay loop muted playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-10"
          src="https://videos.pexels.com/video-files/3214439/3214439-hd_1920_1080_25fps.mp4"
        />
        <div className="relative max-w-7xl mx-auto px-6 lg:px-12">
          <ContentSection className="text-center mb-8">
            <h2 className="text-4xl lg:text-5xl font-bold text-primary mb-4">
              An Arsenal of <span className="gold-text-gradient">Professional Tools</span>
            </h2>
            <p className="text-xl text-secondary">
              Engineered for performance, powered by AI. Your trading, elevated.
            </p>
          </ContentSection>

          <ToolsCarousel />

          <ContentSection className="text-center mt-8">
            <Link to={createPageUrl("AdvancedTools")}>
              <Button size="lg" variant="outline" className="text-primary border-default hover:bg-surface hover:border-primary">
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
            <h2 className="text-4xl lg:text-5xl font-bold text-primary mb-6">
              Ready to Join the <span className="gold-text-gradient">Elite?</span>
            </h2>
            <p className="text-xl text-secondary mb-10">
              Your journey to trading mastery and professional partnership begins now.
              Take the definitive step towards your financial ambitions.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to={createPageUrl("AccessPortal")}>
                <Button size="lg" className="bg-accent-green hover:bg-green-500 text-white font-semibold px-10 py-4 rounded-xl transition-all duration-300 transform hover:scale-105">
                  Become a Member
                </Button>
              </Link>
            </div>
          </ContentSection>
        </div>
      </section>
      <style>{`
        .animate-fade-in {
          animation: fadeIn 0.7s ease-in-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* AI Tech Font Styles */
        .imperial-tech-font {
          font-family: 'Orbitron', 'Courier New', monospace;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          background: linear-gradient(135deg, #e6d3b3, #c09a58);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-shadow: 0 0 20px rgba(192, 154, 88, 0.4);
          position: relative;
        }

        .imperial-tech-font::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(90deg, transparent, rgba(192, 154, 88, 0.3), transparent);
          animation: tech-scan 3s infinite;
          pointer-events: none;
        }

        @keyframes tech-scan {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        /* Load Orbitron font */
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
      `}</style>
    </div>
  );
}
