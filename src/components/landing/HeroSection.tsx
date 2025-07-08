
import React from "react";
import { Crown, ChevronDown } from "lucide-react";
import ContentSection from "./ContentSection";

export default function HeroSection() {
  return (
    <section className="relative h-screen flex flex-col items-center justify-start text-center pt-20 sm:pt-24 md:pt-32 overflow-x-hidden px-4">
      <ContentSection>
        <div className="relative flex justify-center mb-6 sm:mb-8 z-10">
          <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-surface/90 backdrop-blur-md rounded-2xl sm:rounded-3xl flex items-center justify-center glow-effect-gold shadow-2xl">
            <Crown className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 text-accent-gold" />
          </div>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-black mb-3 sm:mb-4 uppercase text-white relative z-10 drop-shadow-2xl">
          <span className="imperial-tech-font">IMPERIAL</span>
        </h1>
        <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-white mb-8 sm:mb-10 max-w-xs sm:max-w-2xl md:max-w-3xl mx-auto relative z-10 px-2 sm:px-4 drop-shadow-lg font-medium leading-relaxed">
          Ascend to the Apex of Trading.
          <br />
          Premium Education, Live Mentorship, and Professional Partnership
          Programs.
        </p>
      </ContentSection>

      <div className="absolute bottom-6 sm:bottom-10 left-1/2 -translate-x-1/2 z-10 hidden sm:block">
        <div className="text-sm sm:text-lg text-white font-medium drop-shadow-md text-center">
          Scroll to begin your journey.
        </div>
        <div className="animate-bounce mt-2 sm:mt-4 flex justify-center">
          <ChevronDown className="w-6 h-6 sm:w-8 sm:h-8 text-white drop-shadow-md" />
        </div>
      </div>
    </section>
  );
}
