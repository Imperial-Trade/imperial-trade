import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle, Star, Shield, Award } from "lucide-react";
import ContentSection from "./ContentSection";
import { useAuth } from "@/contexts/AuthContext";
export default function FinalCTA() {
  const {
    user,
    loading
  } = useAuth();
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
  const benefits = [{
    icon: Star,
    text: "AI-powered trading signals with accuracy"
  }, {
    icon: Shield,
    text: "Enterprise-grade security and protection"
  }, {
    icon: Award,
    text: "Top-tier trading platform"
  }, {
    icon: CheckCircle,
    text: "24/7 professional support"
  }];
  return <section className="relative py-32 bg-primary text-primary-foreground">
      <div className="absolute inset-0 bg-gradient-to-br from-white via-gray-100/40 via-black/10 to-primary/20 backdrop-blur-sm">
        <div className="absolute top-20 left-20 w-96 h-96 bg-primary-foreground rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-primary-foreground rounded-full blur-3xl" />
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
                Transform your trading and get the edge with our AI-powered platform.
              </p>
            </div>

            {/* Benefits Grid */}
            <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              {benefits.map((benefit, index) => <div key={benefit.text} className="flex items-center gap-4 p-4 bg-card/50 backdrop-blur-xl rounded-2xl border border-border/50">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <benefit.icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-foreground font-medium">{benefit.text}</span>
                </div>)}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              {!loading && (user ? <Link to="/dashboard/home">
                    <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-12 py-6 text-xl rounded-2xl transition-all duration-300 shadow-2xl">
                      Access Dashboard
                      <ArrowRight className="ml-3 h-6 w-6" />
                    </Button>
                  </Link> : <Link to={createPageUrl("account-request")}>
                    <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-12 py-6 text-xl rounded-2xl transition-all duration-300 shadow-2xl">
                      Start Trading Now
                      <ArrowRight className="ml-3 h-6 w-6" />
                    </Button>
                  </Link>)}

              <Link to={createPageUrl("account-request-status")}>
                <Button variant="outline" size="lg" className="border-2 border-primary/30 text-foreground hover:bg-primary/10 font-semibold px-12 py-6 text-xl rounded-2xl transition-all duration-300 backdrop-blur-xl">
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
              
              <p className="text-xs text-foreground/80">
                We're building for you. In the spirit of transparency, we want you to know that some exciting new features are currently in development and will be rolled out soon.
              </p>
            </div>
          </div>
        </ContentSection>
      </div>
    </section>;
}