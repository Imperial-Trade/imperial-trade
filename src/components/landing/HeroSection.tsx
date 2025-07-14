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
      {/* Apple-style gradient orbs */}
      <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full opacity-20 blur-3xl animate-float" />
      <div className="absolute bottom-20 right-10 w-80 h-80 bg-gradient-to-r from-blue-400 to-purple-600 rounded-full opacity-20 blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      
      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        <ContentSection>
          <div className="space-y-8 max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              Elite Trading Platform
            </div>

            {/* Main headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold leading-tight">
              Trading
              <span className="gradient-text block">
                Reimagined
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Join thousands of traders using our AI-powered platform to make smarter decisions, 
              manage risk, and achieve consistent profits.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              {!loading && (
                user ? (
                  <Link to="/dashboard/home">
                    <Button
                      size="lg"
                      className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-4 text-lg rounded-2xl transition-all duration-300 transform hover:scale-105 animate-pulse-glow"
                    >
                      Access Dashboard
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                ) : (
                  <Link to={createPageUrl("account-request")}>
                    <Button
                      size="lg"
                      className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-4 text-lg rounded-2xl transition-all duration-300 transform hover:scale-105 animate-pulse-glow"
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
                className="border-2 border-border/50 text-foreground hover:bg-muted/50 font-semibold px-8 py-4 text-lg rounded-2xl transition-all duration-300 backdrop-blur-sm"
              >
                <Play className="mr-2 h-5 w-5" />
                Watch Demo
              </Button>
            </div>

            {/* Social proof */}
            <div className="flex flex-wrap justify-center items-center gap-8 pt-8 opacity-60">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">10K+</div>
                <div className="text-sm text-muted-foreground">Active Traders</div>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">$2.5B</div>
                <div className="text-sm text-muted-foreground">Volume Traded</div>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">92%</div>
                <div className="text-sm text-muted-foreground">Success Rate</div>
              </div>
            </div>
          </div>
        </ContentSection>
      </div>
    </section>
  );
}