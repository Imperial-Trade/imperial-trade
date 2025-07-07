import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Crown,
  Users,
  TrendingUp,
  BookOpen,
  Shield,
  Award,
  Target,
  Zap,
  Globe,
  CheckCircle,
  Star,
} from "lucide-react";

const ContentSection = ({ children, className = "", style = {} }) => {
  const contentRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
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
    <div
      ref={contentRef}
      className={`scroll-reveal ${className}`}
      style={style}
    >
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
          const numericValue = parseFloat(
            value.toString().replace(/[^0-9.]/g, "")
          );

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
      {formatNumber(count)}
      {suffix}
    </div>
  );
};

export default function About() {
  const features = [
    {
      icon: BookOpen,
      title: "Comprehensive Education",
      description:
        "Over 500+ premium video courses covering every aspect of trading, from basic concepts to advanced strategies used by professional traders.",
    },
    {
      icon: Users,
      title: "Elite Community",
      description:
        "Join 10,000+ active traders sharing insights, strategies, and real-time market analysis in our exclusive community forum.",
    },
    {
      icon: TrendingUp,
      title: "Live Market Analysis",
      description:
        "Daily live streaming sessions with expert traders providing real-time market commentary and trading opportunities.",
    },
    {
      icon: Shield,
      title: "Risk Management Focus",
      description:
        "Learn proven risk management techniques that protect your capital while maximizing your trading potential.",
    },
    {
      icon: Target,
      title: "Proven Strategies",
      description:
        "Access time-tested trading strategies with detailed explanations and real-world application examples.",
    },
    {
      icon: Zap,
      title: "Cutting-Edge Tools",
      description:
        "Utilize advanced trading tools and indicators to identify high-probability trading setups.",
    },
  ];

  const stats = [
    { number: "10000", label: "Active Members", icon: Users, suffix: "+" },
    { number: "500", label: "Video Courses", icon: BookOpen, suffix: "+" },
    { number: "95", label: "Success Rate", icon: TrendingUp, suffix: "%" },
    { number: "24", label: "Community Support", icon: Shield, suffix: "/7" },
    { number: "50", label: "Expert Traders", icon: Award, suffix: "+" },
    { number: "5", label: "Years Experience", icon: Star, suffix: "" },
  ];

  const teamMembers = [
    {
      name: "Alex Chen",
      role: "Founder & Lead Strategist",
      experience: "15+ years in institutional trading",
      specialty: "Options & Derivatives",
      image:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    },
    {
      name: "Sarah Martinez",
      role: "Head of Education",
      experience: "12+ years in retail trading",
      specialty: "Technical Analysis",
      image:
        "https://images.unsplash.com/photo-1494790108755-2616b612b5bc?w=150&h=150&fit=crop&crop=face",
    },
    {
      name: "Mike Johnson",
      role: "Risk Management Expert",
      experience: "10+ years in hedge funds",
      specialty: "Risk & Portfolio Management",
      image:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    },
    {
      name: "Emily Rodriguez",
      role: "Market Analyst",
      experience: "8+ years in equity research",
      specialty: "Fundamental Analysis",
      image:
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
    },
  ];

  const achievements = [
    "Featured in Forbes 'Top Trading Communities'",
    "Winner of 'Best Educational Platform 2023'",
    "Recognized by TradingView as 'Premier Partner'",
    "Over 1 Million Hours of Educational Content Delivered",
    "Consistently Rated 4.9/5 by Members",
  ];

  return (
    <div className="min-h-screen p-6 bg-background">
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <ContentSection className="text-center mb-16">
          <div className="flex justify-center mb-8">
            <div className="w-24 h-24 bg-surface rounded-3xl flex items-center justify-center glow-effect-gold">
              <Crown className="w-16 h-16 text-accent-gold" />
            </div>
          </div>

          <h1 className="text-4xl lg:text-6xl font-bold text-primary mb-6">
            <span className="gold-text-gradient">IMPERIAL</span>
            <br />
            <span className="text-2xl lg:text-3xl text-secondary">
              Trading Community
            </span>
          </h1>

          <p className="text-xl text-secondary max-w-4xl mx-auto leading-relaxed">
            We are the world's premier trading education platform, dedicated to
            transforming aspiring traders into market professionals through
            comprehensive education, live mentorship, and an elite community of
            successful traders.
          </p>
        </ContentSection>

        {/* Mission Statement */}
        <ContentSection className="mb-16">
          <Card className="glass-effect glow-effect-green">
            <CardContent className="p-8 lg:p-12 text-center">
              <h2 className="text-3xl font-bold text-primary mb-6">
                Our Mission
              </h2>
              <p className="text-lg text-secondary leading-relaxed max-w-4xl mx-auto">
                To democratize access to professional-grade trading education
                and create a supportive community where traders of all levels
                can learn, grow, and achieve financial independence through
                disciplined trading practices and proven strategies.
              </p>
            </CardContent>
          </Card>
        </ContentSection>

        {/* Stats Section */}
        <ContentSection className="mb-16">
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-6">
            {stats.map((stat, index) => (
              <Card key={index} className="glass-effect text-center">
                <CardContent className="p-6">
                  <stat.icon className="w-8 h-8 text-accent-green mx-auto mb-3" />
                  <AnimatedCounter value={stat.number} suffix={stat.suffix} />
                  <div className="text-sm text-secondary">{stat.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ContentSection>

        {/* Features Section */}
        <ContentSection className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-primary mb-4">
              Why Choose <span className="text-accent-gold">Imperial</span>?
            </h2>
            <p className="text-xl text-secondary">
              Everything you need to succeed in the markets
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <ContentSection
                key={index}
                style={{ transitionDelay: `${index * 200}ms` }}
              >
                <Card className="glass-effect group hover:border-accent-green transition-all duration-300">
                  <CardContent className="p-8">
                    <div className="w-16 h-16 bg-surface rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                      <feature.icon className="w-8 h-8 text-accent-green" />
                    </div>
                    <h3 className="text-xl font-semibold text-primary mb-4">
                      {feature.title}
                    </h3>
                    <p className="text-secondary leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </ContentSection>
            ))}
          </div>
        </ContentSection>

        {/* Team Section */}
        <ContentSection className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-primary mb-4">
              Meet Our <span className="text-accent-gold">Expert Team</span>
            </h2>
            <p className="text-xl text-secondary">
              Learn from seasoned professionals with decades of combined
              experience
            </p>
          </div>

          <div className="grid lg:grid-cols-4 gap-8">
            {teamMembers.map((member, index) => (
              <ContentSection
                key={index}
                style={{ transitionDelay: `${index * 150}ms` }}
              >
                <Card className="glass-effect group hover:border-accent-green transition-all duration-300">
                  <CardContent className="p-6 text-center">
                    <img
                      src={member.image}
                      alt={member.name}
                      className="w-20 h-20 rounded-full mx-auto mb-4 object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    <h3 className="text-lg font-semibold text-primary mb-1">
                      {member.name}
                    </h3>
                    <p className="text-accent-gold text-sm mb-2">
                      {member.role}
                    </p>
                    <p className="text-secondary text-sm mb-2">
                      {member.experience}
                    </p>
                    <Badge
                      variant="outline"
                      className="border-default text-secondary text-xs"
                    >
                      {member.specialty}
                    </Badge>
                  </CardContent>
                </Card>
              </ContentSection>
            ))}
          </div>
        </ContentSection>

        {/* Achievements Section */}
        <ContentSection className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-primary mb-4">
              Our <span className="text-accent-gold">Achievements</span>
            </h2>
          </div>

          <Card className="glass-effect">
            <CardContent className="p-8">
              <div className="grid lg:grid-cols-2 gap-6">
                {achievements.map((achievement, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-accent-green flex-shrink-0" />
                    <span className="text-secondary">{achievement}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </ContentSection>

        {/* Values Section */}
        <ContentSection className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-primary mb-4">
              Our <span className="text-accent-gold">Core Values</span>
            </h2>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {[
              {
                title: "Integrity",
                description:
                  "We provide honest, transparent education without unrealistic promises or get-rich-quick schemes.",
              },
              {
                title: "Excellence",
                description:
                  "We maintain the highest standards in our content, instruction, and community support.",
              },
              {
                title: "Community",
                description:
                  "We foster a supportive environment where traders help each other succeed.",
              },
            ].map((value, index) => (
              <ContentSection
                key={index}
                style={{ transitionDelay: `${index * 200}ms` }}
              >
                <Card className="glass-effect text-center">
                  <CardContent className="p-8">
                    <h3 className="text-xl font-semibold text-primary mb-4">
                      {value.title}
                    </h3>
                    <p className="text-secondary">{value.description}</p>
                  </CardContent>
                </Card>
              </ContentSection>
            ))}
          </div>
        </ContentSection>

        {/* Contact Section */}
        <ContentSection>
          <Card className="glass-effect text-center">
            <CardContent className="p-8 lg:p-12">
              <h2 className="text-3xl font-bold text-primary mb-4">
                Ready to Join the{" "}
                <span className="text-accent-gold">Imperial</span> Family?
              </h2>
              <p className="text-lg text-secondary mb-6 max-w-2xl mx-auto">
                Take the first step towards trading mastery. Join thousands of
                successful traders who have transformed their financial future
                with Imperial Trading Community.
              </p>
              <div className="flex items-center justify-center gap-4 text-secondary">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  <span>Global Community</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  <span>Trusted Platform</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  <span>Award Winning</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </ContentSection>
      </div>
    </div>
  );
}
