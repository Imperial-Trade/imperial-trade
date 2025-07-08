import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import ContentSection from "./ContentSection";
import { features } from "./constants";

export default function FeatureCarousel() {
  const [activeFeatureIndex, setActiveFeatureIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveFeatureIndex((prevIndex) => (prevIndex + 1) % features.length);
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  const activeFeature = features[activeFeatureIndex];

  return (
    <section className="w-full bg-background py-16 sm:py-20 md:py-24 z-10 relative overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
        <ContentSection>
          <div className="text-center mb-8 sm:mb-10 md:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 sm:mb-4 drop-shadow-lg px-2">
              Your Path to{" "}
              <span className="gold-text-gradient">Trading Mastery</span>
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-white/90 max-w-xs sm:max-w-2xl md:max-w-3xl mx-auto drop-shadow-md px-2">
              A complete ecosystem of tools, education, and community support,
              seamlessly integrated.
            </p>
          </div>
        </ContentSection>
        <ContentSection>
          <div className="relative w-full rounded-xl sm:rounded-2xl overflow-hidden glass-effect">
            {/* Background Videos */}
            {features.map((feature, index) => (
              <video
                key={feature.videoSrc}
                src={feature.videoSrc}
                autoPlay
                loop
                muted
                playsInline
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out z-[-1] ${
                  activeFeatureIndex === index ? "opacity-100" : "opacity-0"
                }`}
              />
            ))}

            {/* Content Overlay */}
            <div className="relative flex flex-col min-h-[400px] sm:min-h-[500px] lg:min-h-[600px]">
              {/* Mobile/Tablet Navigation */}
              <div className="w-full bg-surface/30 backdrop-blur-sm p-3 sm:p-4 lg:hidden overflow-x-auto scrollbar-hide">
                <div className="flex gap-2 sm:gap-3 min-w-max">
                  {features.map((feature, index) => {
                    const Icon = feature.icon;
                    return (
                      <button
                        key={feature.title}
                        onClick={() => setActiveFeatureIndex(index)}
                        className={`relative flex-shrink-0 text-left p-2 sm:p-3 rounded-lg transition-all duration-300 flex items-center gap-2 sm:gap-3 ${
                          activeFeatureIndex === index
                            ? "bg-accent-green/20"
                            : "hover:bg-surface/50"
                        }`}
                      >
                        <Icon
                          className={`w-4 h-4 sm:w-5 sm:h-5 transition-colors duration-300 ${
                            activeFeatureIndex === index
                              ? "text-accent-green"
                              : "text-white/70"
                          }`}
                        />
                        <span
                          className={`font-semibold text-sm sm:text-base whitespace-nowrap transition-colors duration-300 ${
                            activeFeatureIndex === index
                              ? "text-white"
                              : "text-white/70"
                          }`}
                        >
                          {feature.title}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Desktop Navigation */}
              <div className="hidden lg:flex">
                <div className="w-full lg:w-1/3 bg-surface/30 backdrop-blur-sm p-6 lg:p-8 flex flex-row lg:flex-col justify-start lg:flex-shrink overflow-x-auto lg:overflow-x-hidden">
                  {features.map((feature, index) => {
                    const Icon = feature.icon;
                    return (
                      <button
                        key={feature.title}
                        onClick={() => setActiveFeatureIndex(index)}
                        className={`relative w-full text-left p-4 rounded-lg transition-all duration-300 mb-2 flex-shrink-0 lg:flex-shrink ${
                          activeFeatureIndex === index
                            ? ""
                            : "hover:bg-surface/50"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <Icon
                            className={`w-6 h-6 transition-colors duration-300 ${
                              activeFeatureIndex === index
                                ? "text-accent-green"
                                : "text-white/70"
                            }`}
                          />
                          <span
                            className={`font-semibold transition-colors duration-300 ${
                              activeFeatureIndex === index
                                ? "text-white"
                                : "text-white/70"
                            }`}
                          >
                            {feature.title}
                          </span>
                        </div>
                        {activeFeatureIndex === index && (
                          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-1 bg-accent-green rounded-t-full"></div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Content Area */}
              <div className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col justify-center lg:w-2/3 lg:ml-auto">
                <div key={activeFeature.title} className="animate-fade-in">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-surface/80 rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4 lg:mb-6 glow-effect-green">
                    <activeFeature.icon className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-accent-green" />
                  </div>
                  <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-2 sm:mb-3 lg:mb-4 drop-shadow-lg leading-tight">
                    {activeFeature.title}
                  </h3>
                  <p className="text-sm sm:text-base lg:text-lg text-white/90 mb-3 sm:mb-4 lg:mb-5 drop-shadow-md leading-relaxed">
                    {activeFeature.description}
                  </p>
                  <p className="text-xs sm:text-sm lg:text-base text-white/70 italic mb-4 sm:mb-6 lg:mb-8 drop-shadow-md leading-relaxed">
                    {activeFeature.detailedContext}
                  </p>
                  <Link to={createPageUrl(activeFeature.link)}>
                    <Button className="bg-accent-green hover:bg-green-500 text-white font-semibold px-4 sm:px-6 lg:px-8 py-2 sm:py-3 text-sm sm:text-base rounded-lg sm:rounded-xl transition-all duration-300 transform hover:scale-105 glow-effect-green drop-shadow-lg w-full sm:w-auto">
                      Explore {activeFeature.title}
                      <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </ContentSection>
      </div>
    </section>
  );
}
