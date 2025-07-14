import React from "react";
import HeroSection from "@/components/landing/HeroSection";
import StatsSection from "@/components/landing/StatsSection";
import ContainerNavigation from "@/components/landing/ContainerNavigation";
import FeatureCarousel from "@/components/landing/FeatureCarousel";
import ToolsShowcase from "@/components/landing/ToolsShowcase";
import FinalCTA from "@/components/landing/FinalCTA";

export default function Landing() {
  return (
    <div className="bg-background text-foreground w-full overflow-x-hidden">
      {/* Minimal professional background */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            background: 'radial-gradient(circle at 20% 50%, hsl(0, 0%, 50%) 0%, transparent 60%), radial-gradient(circle at 80% 20%, hsl(0, 0%, 30%) 0%, transparent 60%)'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />
      </div>

      <HeroSection />
      <StatsSection />
      <ContainerNavigation />
      <FeatureCarousel />
      <ToolsShowcase />
      <FinalCTA />
    </div>
  );
}