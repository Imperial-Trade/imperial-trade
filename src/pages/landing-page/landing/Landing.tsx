import React from "react";
import HeroSection from "@/components/landing/HeroSection";
import StatsSection from "@/components/landing/StatsSection";
import FeatureCarousel from "@/components/landing/FeatureCarousel";
import ToolsShowcase from "@/components/landing/ToolsShowcase";
import FinalCTA from "@/components/landing/FinalCTA";

export default function Landing() {
  return (
    <div className="bg-background text-foreground w-full overflow-x-hidden">
      {/* Apple/Stripe inspired gradient background */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            background: 'radial-gradient(circle at 20% 50%, hsl(242, 47%, 58%) 0%, transparent 50%), radial-gradient(circle at 80% 20%, hsl(250, 84%, 54%) 0%, transparent 50%), radial-gradient(circle at 40% 80%, hsl(264, 83%, 58%) 0%, transparent 50%)'
          }}
        />
      </div>

      <HeroSection />
      <StatsSection />
      <FeatureCarousel />
      <ToolsShowcase />
      <FinalCTA />
    </div>
  );
}