import React from "react";
import HeroSection from "@/components/landing/HeroSection";
import StatsSection from "@/components/landing/StatsSection";
import FeatureCarousel from "@/components/landing/FeatureCarousel";
import ToolsShowcase from "@/components/landing/ToolsShowcase";
import FinalCTA from "@/components/landing/FinalCTA";
import TradingFeaturesInterface from "@/components/landing/TradingFeaturesInterface";

export default function Landing() {
  return (
    <div className="bg-background text-foreground w-full overflow-x-hidden relative">
      {/* Modern gradient background with animated elements */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        {/* Primary gradient overlay */}
        <div 
          className="absolute inset-0 opacity-40"
          style={{
            background: 'radial-gradient(circle at 20% 50%, hsl(242, 47%, 58%) 0%, transparent 60%), radial-gradient(circle at 80% 20%, hsl(250, 84%, 54%) 0%, transparent 60%), radial-gradient(circle at 40% 80%, hsl(264, 83%, 58%) 0%, transparent 60%)'
          }}
        />
        
        {/* Animated floating orbs */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-gradient-to-r from-primary/20 to-blue-500/20 rounded-full blur-3xl animate-float" />
        <div className="absolute top-60 right-20 w-96 h-96 bg-gradient-to-r from-purple-500/20 to-primary/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-40 left-1/3 w-64 h-64 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }} />
      </div>

      {/* Content sections with improved spacing */}
      <div className="relative z-10">
        <HeroSection />
        <div className="py-20">
          <StatsSection />
        </div>
        
        {/* Professional Trading Features Interface */}
        <TradingFeaturesInterface />
        
        <div className="py-20">
          <FeatureCarousel />
        </div>
        <div className="py-20">
          <ToolsShowcase />
        </div>
        <div className="py-20">
          <FinalCTA />
        </div>
      </div>
    </div>
  );
}