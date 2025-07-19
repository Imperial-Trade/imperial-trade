import React, { useEffect } from "react";
import HeroSection from "@/components/landing/HeroSection";
import StatsSection from "@/components/landing/StatsSection";
import FeatureCarousel from "@/components/landing/FeatureCarousel";
import ToolsCarousel from "@/components/landing/ToolsCarousel";
import FinalCTA from "@/components/landing/FinalCTA";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      <HeroSection />
      <StatsSection />
      <FeatureCarousel />
      <ToolsCarousel />
      <FinalCTA />
    </div>
  );
};

export default Landing;
