
import React from "react";
import ContentSection from "./ContentSection";
import ToolsCarousel from "./ToolsCarousel";

export default function ToolsShowcase() {
  return (
    <section className="relative w-full bg-surface py-8 sm:py-10 md:py-12 overflow-hidden z-10">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-10"
        src="https://videos.pexels.com/video-files/3214439/3214439-hd_1920_1080_25fps.mp4"
      />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
        <ContentSection className="text-center mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 sm:mb-4 drop-shadow-lg px-2">
            An Arsenal of{" "}
            <span className="gold-text-gradient">Professional Tools</span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-white/90 drop-shadow-md px-2">
            Engineered for performance, powered by AI. Your trading, elevated.
          </p>
        </ContentSection>

        <ToolsCarousel />
      </div>
    </section>
  );
}
