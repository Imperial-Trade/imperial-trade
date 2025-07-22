import React, { useEffect } from "react";
import HeroSection from "@/components/landing/HeroSection";
import StatsSection from "@/components/landing/StatsSection";
import FeatureCarousel from "@/components/landing/FeatureCarousel";
import ToolsShowcase from "@/components/landing/ToolsShowcase";
import ToolsCarousel from "@/components/landing/ToolsCarousel";
import FinalCTA from "@/components/landing/FinalCTA";
import { ComplianceFooter } from "@/components/compliance/ComplianceFooter";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      <HeroSection />
      <StatsSection />
      <FeatureCarousel />
      <ToolsShowcase />
      <ToolsCarousel />
      <FinalCTA />
      <ComplianceFooter />
    </div>
  );
};

export default Landing;
