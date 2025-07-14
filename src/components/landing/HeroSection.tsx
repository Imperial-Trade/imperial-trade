import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";
import ContentSection from "./ContentSection";
import { useAuth } from "@/contexts/AuthContext";

export default function HeroSection() {
  const { user, loading } = useAuth();

  return (
    <section className="relative min-h-screen flex items-center justify-center text-center z-10 overflow-hidden">
      {/* Minimal professional background */}
      <div className="absolute top-40 left-20 w-72 h-72 bg-gradient-to-r from-muted to-muted/50 rounded-full opacity-10 blur-3xl animate-float" />
      <div className="absolute bottom-40 right-20 w-64 h-64 bg-gradient-to-r from-muted/50 to-muted rounded-full opacity-10 blur-3xl animate-float" style={{ animationDelay: '3s' }} />
      
      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        <ContentSection>
          <div className="space-y-12 max-w-5xl mx-auto">
            {/* Professional badge */}
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-card border border-border text-foreground text-sm font-medium shadow-sm">
              <div className="w-2 h-2 bg-feature-green rounded-full animate-pulse" />
              Professional Trading Platform
            </div>

            {/* Main headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-8xl font-bold leading-tight tracking-tight">
              Trade Like A
              <span className="block bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                Professional
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl lg:text-2xl text-muted-foreground max-w-4xl mx-auto leading-relaxed font-light">
              The most advanced trading platform designed by professionals, for professionals. 
              Join 10,000+ traders achieving consistent results with our AI-powered tools.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center pt-4">
              {!loading && (
                user ? (
                  <Link to="/dashboard/home">
                    <Button
                      size="lg"
                      className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-10 py-4 text-lg rounded-xl transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
                    >
                      Access Dashboard
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                ) : (
                  <Link to={createPageUrl("account-request")}>
                    <Button
                      size="lg"
                      className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-10 py-4 text-lg rounded-xl transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
                    >
                      Start Trading
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                )
              )}

              <Button
                variant="outline"
                size="lg"
                className="border-2 border-border hover:bg-muted/30 font-medium px-10 py-4 text-lg rounded-xl transition-all duration-300 transform hover:scale-[1.02]"
              >
                <Play className="mr-2 h-5 w-5" />
                Watch Demo
              </Button>
            </div>

            {/* Professional stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 pt-12 max-w-3xl mx-auto">
              <div className="text-center space-y-2">
                <div className="text-3xl font-bold text-foreground">10K+</div>
                <div className="text-sm text-muted-foreground font-medium">Active Traders</div>
              </div>
              <div className="text-center space-y-2">
                <div className="text-3xl font-bold text-foreground">$2.5B</div>
                <div className="text-sm text-muted-foreground font-medium">Volume Traded</div>
              </div>
              <div className="text-center space-y-2">
                <div className="text-3xl font-bold text-foreground">92%</div>
                <div className="text-sm text-muted-foreground font-medium">Success Rate</div>
              </div>
              <div className="text-center space-y-2">
                <div className="text-3xl font-bold text-foreground">24/7</div>
                <div className="text-sm text-muted-foreground font-medium">Support</div>
              </div>
            </div>
          </div>
        </ContentSection>
      </div>
    </section>
  );
}