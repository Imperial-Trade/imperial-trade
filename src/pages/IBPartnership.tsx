
import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Crown, 
  TrendingUp, 
  Users, 
  Shield, 
  Target,
  Award,
  DollarSign,
  Star,
  CheckCircle,
  Zap,
  Globe,
  Briefcase,
  Info
} from "lucide-react";
import CompensationPlan from "../components/compensation/CompensationPlan";
import ProgressionChart from "../components/compensation/ProgressionChart";

const ContentSection = ({ children, className = '' }) => {
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
    <div ref={contentRef} className={`scroll-reveal ${className}`}>
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
    <div ref={counterRef} className="text-2xl font-bold text-primary mb-1">
      {formatNumber(count)}{suffix}
    </div>
  );
};

export default function IBPartnership() {
  const eligibilityRef = useRef(null);
  const [isGlowing, setIsGlowing] = useState(false);

  const handleScrollToEligibility = () => {
    if (eligibilityRef.current) {
      eligibilityRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setIsGlowing(true);
      // Remove the glow after the animation finishes
      setTimeout(() => {
        setIsGlowing(false);
      }, 2500); // Animation duration is 2s, wait a bit longer
    }
  };

  const benefits = [
    {
      icon: DollarSign,
      title: "Industry-Leading Rebates",
      description: "Earn up to $20 per lot with our 6-tier progression system designed to reward your growth and dedication."
    },
    {
      icon: Crown,
      title: "Exclusive Imperial Perks",
      description: "Luxury Asia retreats, 7-day cruises, and the exclusive Imperial Gold Necklace for top performers."
    },
    {
      icon: Shield,
      title: "Comprehensive Support",
      description: "Dedicated account management, marketing materials, and priority technical support."
    },
    {
      icon: Globe,
      title: "Global Market Access",
      description: "Access to forex, commodities, indices, and cryptocurrencies with institutional-grade execution."
    },
    {
      icon: Zap,
      title: "Real-Time Analytics",
      description: "Advanced reporting dashboard to track your clients' performance and your earnings in real-time."
    },
    {
      icon: Users,
      title: "Community Network",
      description: "Join an elite network of successful IBs sharing strategies and best practices."
    }
  ];

  const requirements = [
    "Proven track record in financial markets or sales",
    "Understanding of forex and CFD trading",
    "Commitment to professional client service",
    "Compliance with regulatory requirements",
    "Active promotion of VT Markets services"
  ];

  const steps = [
    {
      step: "1",
      title: "Application",
      description: "Submit your IB application with relevant experience and business plan."
    },
    {
      step: "2", 
      title: "Review & Approval",
      description: "Our partnership team reviews your application and conducts a brief interview."
    },
    {
      step: "3",
      title: "Onboarding",
      description: "Complete training modules and receive your marketing materials and tracking links."
    },
    {
      step: "4",
      title: "Launch",
      description: "Start referring clients and earning rebates from your first successful trade."
    }
  ];

  const keyStats = [
    { value: "20", suffix: "/lot", label: "Max Rebate" },
    { value: "6", suffix: "", label: "Tier System" },
    { value: "50", suffix: "+", label: "IB Partners" },
    { value: "24", suffix: "/7", label: "Support" }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section with Video Background */}
      <section className="relative h-[70vh] flex items-center justify-center text-center overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute z-0 w-auto min-w-full min-h-full max-w-none"
        >
          <source
            src="https://videos.pexels.com/video-files/3209828/3209828-hd_1920_1080_25fps.mp4"
            type="video/mp4"
          />
          Your browser does not support the video tag.
        </video>
        <div className="absolute inset-0 bg-background/60 z-10"></div>
        <ContentSection className="relative z-20 px-6">
          <div className="flex justify-center mb-8">
            <div className="w-24 h-24 bg-surface rounded-3xl flex items-center justify-center glow-effect-gold">
              <Briefcase className="w-16 h-16 text-accent-gold" />
            </div>
          </div>
          
          <h1 className="text-4xl lg:text-6xl font-bold text-primary mb-6">
            <span className="text-accent-gold">IB Partnership</span>
            <br />
            <span className="text-2xl lg:text-3xl text-secondary">Program</span>
          </h1>
          
          <p className="text-xl text-secondary max-w-4xl mx-auto leading-relaxed mb-8">
            Join Imperial Trading Community's exclusive Introducing Broker program with VT Markets. 
            Build a thriving business with industry-leading rebates, luxury rewards, and comprehensive support.
          </p>

          <div ref={eligibilityRef} className={`mt-10 max-w-3xl mx-auto rounded-xl ${isGlowing ? 'glow-animation' : ''}`}>
            <div className="glass-effect border-accent-gold/30 rounded-xl p-6 text-center glow-effect-gold">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 bg-surface rounded-full flex items-center justify-center">
                  <Info className="w-6 h-6 text-accent-gold" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-primary mb-2">Eligibility Check Required</h3>
              <p className="text-secondary leading-relaxed">
                This is an exclusive, invitation-only program. Please contact the person who invited you to confirm your eligibility and check if a position is available.
              </p>
            </div>
          </div>
        </ContentSection>
      </section>

      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Key Stats Section */}
          <ContentSection className="mb-16 mt-16">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
              {keyStats.map((stat, index) => (
                <Card key={index} className="glass-effect">
                  <CardContent className="p-6">
                    <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                    <div className="text-sm text-secondary uppercase tracking-widest">{stat.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ContentSection>

          {/* IB Progression Path Chart */}
          <ContentSection className="mb-16">
            <ProgressionChart />
          </ContentSection>

          {/* Key Benefits */}
          <ContentSection className="mb-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-primary mb-4">
                Why Partner with <span className="text-accent-gold">Imperial</span>?
              </h2>
              <p className="text-xl text-secondary">
                Unmatched benefits designed for serious business builders
              </p>
            </div>
            
            <div className="grid lg:grid-cols-3 gap-8">
              {benefits.map((benefit, index) => (
                <ContentSection key={index} style={{ transitionDelay: `${index * 150}ms` }}>
                  <Card className="glass-effect group hover:border-accent-green transition-all duration-300">
                    <CardContent className="p-8">
                      <div className="w-16 h-16 bg-surface rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                        <benefit.icon className="w-8 h-8 text-accent-green" />
                      </div>
                      <h3 className="text-xl font-semibold text-primary mb-4">{benefit.title}</h3>
                      <p className="text-secondary leading-relaxed">{benefit.description}</p>
                    </CardContent>
                  </Card>
                </ContentSection>
              ))}
            </div>
          </ContentSection>

          {/* Compensation Plan */}
          <ContentSection className="mb-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-primary mb-4">
                Compensation <span className="text-accent-gold">Structure</span>
              </h2>
              <p className="text-xl text-secondary">
                Transparent, performance-based rewards that grow with your success
              </p>
            </div>
            
            <CompensationPlan onBecomePartnerClick={handleScrollToEligibility} />
          </ContentSection>

          {/* Requirements */}
          <ContentSection className="mb-16">
            <div className="grid lg:grid-cols-2 gap-8">
              <Card className="glass-effect">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold text-primary flex items-center gap-2">
                    <CheckCircle className="w-6 h-6 text-accent-green" />
                    Partner Requirements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {requirements.map((requirement, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-accent-green flex-shrink-0 mt-0.5" />
                        <span className="text-secondary">{requirement}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-effect">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold text-primary flex items-center gap-2">
                    <Star className="w-6 h-6 text-accent-gold" />
                    What You'll Receive
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      "Personalized IB tracking links",
                      "Professional marketing materials",
                      "Real-time commission dashboard",
                      "Dedicated account manager",
                      "Weekly performance reports",
                      "Access to exclusive events"
                    ].map((item, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <Star className="w-5 h-5 text-accent-gold flex-shrink-0 mt-0.5" />
                        <span className="text-secondary">{item}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </ContentSection>

          {/* Getting Started Steps */}
          <ContentSection className="mb-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-primary mb-4">
                Getting <span className="text-accent-gold">Started</span>
              </h2>
              <p className="text-xl text-secondary">
                Simple 4-step process to launch your IB business
              </p>
            </div>
            
            <div className="grid lg:grid-cols-4 gap-8">
              {steps.map((stepItem, index) => (
                <ContentSection key={index} style={{ transitionDelay: `${index * 200}ms` }}>
                  <Card className="glass-effect text-center">
                    <CardContent className="p-8">
                      <div className="w-16 h-16 bg-accent-green rounded-full flex items-center justify-center mx-auto mb-6 text-white font-bold text-2xl">
                        {stepItem.step}
                      </div>
                      <h3 className="text-xl font-semibold text-primary mb-4">{stepItem.title}</h3>
                      <p className="text-secondary">{stepItem.description}</p>
                    </CardContent>
                  </Card>
                </ContentSection>
              ))}
            </div>
          </ContentSection>

          {/* Contact Section */}
          <ContentSection>
            <Card className="glass-effect text-center glow-effect-gold">
              <CardContent className="p-8 lg:p-12">
                <h2 className="text-3xl font-bold text-primary mb-4">
                  Ready to Build Your <span className="text-accent-gold">IB Empire</span>?
                </h2>
                <p className="text-lg text-secondary mb-6 max-w-2xl mx-auto">
                  Join the elite ranks of Imperial IB partners and start building a thriving business today. 
                  Our team is ready to support your success every step of the way.
                </p>
                <Button 
                  onClick={handleScrollToEligibility}
                  className="bg-accent-green hover:bg-green-500 text-white font-semibold px-8 py-3 text-xl glow-effect-green"
                >
                  Become an IB Partner
                </Button>
                <div className="mt-8 max-w-3xl mx-auto">
                  <div className="glass-effect border-accent-gold/30 rounded-xl p-6 text-center">
                    <div className="flex justify-center mb-4">
                      <div className="w-12 h-12 bg-surface rounded-full flex items-center justify-center">
                        <Info className="w-6 h-6 text-accent-gold" />
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold text-primary mb-2">Invitation Only</h3>
                    <p className="text-secondary leading-relaxed">
                      To maintain the quality of our network, partnership is by invitation only. Please contact your Imperial representative for more details.
                    </p>
                  </div>
                </div>
                <div className="mt-8 flex justify-center items-center gap-4 text-secondary">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    <span>Regulated & Secure</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    <span>Award Winning</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    <span>Global Reach</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </ContentSection>
        </div>
      </div>
    </div>
  );
}
