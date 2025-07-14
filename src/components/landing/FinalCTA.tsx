
import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle, Star, Shield, Award } from "lucide-react";
import ContentSection from "./ContentSection";
import { useAuth } from "@/contexts/AuthContext";

export default function FinalCTA() {
  const { user, loading } = useAuth();
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return;
      
      const rect = sectionRef.current.getBoundingClientRect();
      const scrolled = window.pageYOffset;
      const parallax = scrolled * -0.3;
      
      sectionRef.current.style.transform = `translate3d(0, ${parallax}px, 0)`;
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const benefits = [
    { icon: Star, text: "AI-powered trading signals with 92% accuracy" },
    { icon: Shield, text: "Enterprise-grade security and protection" },
    { icon: Award, text: "Award-winning trading platform" },
    { icon: CheckCircle, text: "24/7 professional support" },
  ];

  return (
    <section ref={sectionRef} className="relative py-32 bg-gradient-to-b from-background to-muted/40 overflow-hidden">
      {/* Stripe-style gradient background */}
      <div className="absolute inset-0">
        <div 
          className="absolute inset-0 opacity-40"
          style={{
            background: 'linear-gradient(135deg, hsl(242, 47%, 58%) 0%, hsl(250, 84%, 54%) 25%, hsl(264, 83%, 58%) 50%, hsl(280, 75%, 60%) 75%, hsl(300, 70%, 62%) 100%)',
            filter: 'blur(60px)'
          }}
        />
      </div>

      {/* Floating Elements */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-10 left-10 w-32 h-32 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full blur-xl animate-float" />
        <div className="absolute top-20 right-20 w-24 h-24 bg-gradient-to-r from-pink-400 to-purple-600 rounded-full blur-xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-20 left-1/3 w-20 h-20 bg-gradient-to-r from-blue-400 to-green-400 rounded-full blur-xl animate-float" style={{ animationDelay: '4s' }} />
      </div>

      <div className="max-w-5xl mx-auto px-6 lg:px-8 relative z-10">
        <ContentSection>
          <div className="text-center space-y-12">
            {/* Main CTA */}
            <div className="space-y-8">
              <h2 className="text-4xl lg:text-7xl font-bold leading-tight">
                Ready to
                <span className="gradient-text block">
                  Trade Like a Pro?
                </span>
              </h2>

              <p className="text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                Join thousands of successful traders who've transformed their trading with our AI-powered platform.
              </p>
            </div>

            {/* Benefits Grid */}
            <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              {benefits.map((benefit, index) => (
                <div 
                  key={benefit.text}
                  className="flex items-center gap-4 p-4 bg-card/50 backdrop-blur-xl rounded-2xl border border-border/50 animate-fade-in-up"
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <benefit.icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-foreground font-medium">{benefit.text}</span>
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
                      className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-12 py-6 text-xl rounded-2xl transition-all duration-300 transform hover:scale-105 animate-pulse-glow shadow-2xl"
                    >
                      Access Dashboard
                      <ArrowRight className="ml-3 h-6 w-6" />
                    </Button>
                  </Link>
                ) : (
                  <Link to={createPageUrl("account-request")}>
                    <Button
                      size="lg"
                      className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-12 py-6 text-xl rounded-2xl transition-all duration-300 transform hover:scale-105 animate-pulse-glow shadow-2xl"
                    >
                      Start Trading Now
                      <ArrowRight className="ml-3 h-6 w-6" />
                    </Button>
                  </Link>
                )
              )}

              <Link to={createPageUrl("account-request-status")}>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-2 border-primary/30 text-foreground hover:bg-primary/10 font-semibold px-12 py-6 text-xl rounded-2xl transition-all duration-300 backdrop-blur-xl"
                >
                  Check Status
                </Button>
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="pt-16 space-y-6">
              <div className="flex justify-center items-center gap-8 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  <span>Bank-grade security</span>
                </div>
                <div className="w-px h-4 bg-border" />
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  <span>Award-winning platform</span>
                </div>
                <div className="w-px h-4 bg-border" />
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>24/7 support</span>
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground">
                Trusted by over 10,000 professional traders worldwide
              </p>
            </div>
          </div>
        </ContentSection>
      </div>
    </section>
  );
}
