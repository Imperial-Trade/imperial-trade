
import React, { useEffect } from 'react';
import { useOptimizedPostHogTracking } from '@/hooks/useOptimizedPostHogTracking';
import HeroSection from '@/components/landing/HeroSection';
import StatsSection from '@/components/landing/StatsSection';
import FeatureCarousel from '@/components/landing/FeatureCarousel';
import ToolsShowcase from '@/components/landing/ToolsShowcase';
import FinalCTA from '@/components/landing/FinalCTA';

const Landing = () => {
  const { track } = useOptimizedPostHogTracking();

  useEffect(() => {
    // Single optimized landing page event (throttled)
    track('landing_page_loaded', {
      page: 'landing',
    });
  }, [track]);

  return (
    <div className="min-h-screen bg-background">
      <HeroSection />
      <StatsSection />
      <FeatureCarousel />
      <ToolsShowcase />
      <FinalCTA />
    </div>
  );
};

export default Landing;
