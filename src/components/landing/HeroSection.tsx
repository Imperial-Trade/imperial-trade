import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";
import ContentSection from "./ContentSection";
import { useAuth } from "@/contexts/AuthContext";
export default function HeroSection() {
  const {
    user,
    loading
  } = useAuth();
  return <section className="relative min-h-screen flex items-center justify-center text-center z-10 overflow-hidden sophisticated-bg-mesh">
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
            {/* Elegant Badge with imperial colors and green accent */}
            <div className="animate-fade-in-up">
              <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-bgGradient-light/80 border border-bgGradient-medium text-gray-darkest text-sm font-medium backdrop-blur-xl">
                <div className="w-2 h-2 bg-imperial-gold rounded-full" />
                <span className="text-slate-600">Elite Trading Platform</span>
                <div className="w-2 h-2 bg-accentGreen-sage rounded-full" />
              </div>
            </div>

            {/* Main headline with imperial white gold & bronze gradient */}
            <div className="animate-scale-in space-y-4">
              <h1 className="text-5xl sm:text-6xl lg:text-8xl font-bold leading-none tracking-tight text-gray-darkest">
                <span className="block">The Future of</span>
                <span className="block imperial-gradient-text">
                  Smart Trading
                </span>
              </h1>
              
              {/* Subtitle with Spanish Gray palette */}
              <p className="text-xl lg:text-2xl text-gray-medium max-w-4xl mx-auto leading-relaxed font-light">
                Experience next-generation trading with AI-powered analytics, real-time signals, 
                and professional-grade tools designed for consistent profitability.
              </p>
            </div>

            {/* Enhanced CTA Buttons */}
            <div className="animate-slide-in-left flex flex-col sm:flex-row gap-6 justify-center items-center pt-4">
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

            {/* Enhanced Social proof with imperial gradient numbers and green accents */}
            <div className="animate-slide-in-right pt-12">
              <div className="flex flex-wrap justify-center items-center gap-12 opacity-80">
                <div className="text-center group">
                  <div className="text-3xl font-bold imperial-gradient-text group-hover:scale-110 transition-transform">15K+</div>
                  <div className="text-sm sage-accent font-medium">Active Traders</div>
                </div>
                <div className="w-px h-10 bg-gradient-to-b from-transparent via-border to-transparent" />
                <div className="text-center group">
                  <div className="text-3xl font-bold imperial-bronze-gradient group-hover:scale-110 transition-transform">$3.2B</div>
                  <div className="text-sm text-muted-foreground font-medium">Volume Traded</div>
                </div>
                <div className="w-px h-10 bg-gradient-to-b from-transparent via-border to-transparent" />
                <div className="text-center group">
                  <div className="text-3xl font-bold imperial-gradient-text group-hover:scale-110 transition-transform">95%</div>
                  <div className="text-sm mint-accent font-medium">Success Rate</div>
                </div>
              </div>
            </div>
          </div>
        </ContentSection>
      </div>
    </section>;
}