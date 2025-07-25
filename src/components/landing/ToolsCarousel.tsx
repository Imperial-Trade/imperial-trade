
import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import ContentSection from "./ContentSection";
import { MeccaLogo } from "@/assets/logos/MeccaLogo";
import { KalcuLogo } from "@/assets/logos/KalcuLogo";
import { JournalXxLogo } from "@/assets/logos/JournalXxLogo";

const tools = [
  {
    name: "MECCA",
    brand: "MECCA",
    tagline: "Processing Infinite Variables. Delivering Singular Clarity.",
    icon: MeccaLogo,
    description:
      "Your personal AI research assistant. Mecca processes market data and your own performance history to provide objective, data-centric feedback. Use it to stress-test your ideas and deepen your analysis before making your own informed decisions.",
    color: "text-purple-400",
  },
  {
    name: "KALCU",
    brand: "KALCU", 
    tagline: "Your Edge, Calculated.",
    icon: KalcuLogo,
    description:
      "A precision toolkit for sophisticated risk management. Calculate position sizes based on your personal risk tolerance across any asset, ensuring you maintain disciplined capital protection in every hypothetical setup you analyze.",
    color: "text-cyan-400",
  },
  {
    name: "JOURNAL XX",
    brand: "JOURNAL XX",
    tagline: "Decode Your Data. Evolve Your Edge.",
    icon: JournalXxLogo,
    description:
      "An intelligent performance diagnostics tool that transforms your trading history into actionable feedback. Log your trades to uncover recurring habits, identify your unique strengths, and systematically optimize your own decision-making process.",
    color: "text-orange-400",
  },
];

export default function ToolsCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prevIndex) => (prevIndex + 1) % tools.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative w-full bg-gradient-to-br from-background via-surface/50 to-background py-24 z-10 overflow-hidden">
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-accent-blue/10 via-accent-purple/10 to-accent-green/10 opacity-30"></div>
      
      <div className="relative max-w-7xl mx-auto px-6 lg:px-12">
        <ContentSection className="text-center mb-12">
          <h2 className="text-4xl lg:text-5xl font-bold text-primary mb-4">
            Advanced Trading <span className="text-gradient bg-gradient-to-r from-accent-gold via-accent-green to-accent-blue bg-clip-text text-transparent">Intelligence</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Experience the future of trading with our AI-powered tool suite designed for professional traders.
          </p>
        </ContentSection>

        <ContentSection>
          <div className="h-[400px] relative flex flex-col items-center justify-center">
            {/* Carousel Items */}
            <div
              className="relative w-full h-[320px]"
              style={{ perspective: "1500px" }}
            >
              {tools.map((tool, index) => {
                const offset = index - activeIndex;
                const sign = Math.sign(offset);
                const absOffset = Math.abs(offset);

                // Determine if the item is "behind" in the rotation for seamless looping
                const isBehind = Math.abs(offset) > tools.length / 2;
                const displayOffset = isBehind
                  ? (tools.length - absOffset) * -sign
                  : offset;

                const transform = {
                  rotateY: displayOffset * -20,
                  translateX: displayOffset * 200,
                  scale: absOffset === 0 ? 1.2 : 0.7,
                  zIndex: tools.length - absOffset,
                };

                const opacity = absOffset <= 2 ? 1 : 0;
                const blur = absOffset === 0 ? "blur(0)" : "blur(2px)";

                // Different card sizes for center vs side items
                const cardWidth = absOffset === 0 ? "w-[480px]" : "w-80";
                const cardHeight = absOffset === 0 ? "h-72" : "h-52";
                const iconSize = absOffset === 0 ? "w-16 h-16" : "w-10 h-10";
                const titleSize = absOffset === 0 ? "text-2xl" : "text-lg";
                const descSize = absOffset === 0 ? "text-base" : "text-sm";
                const padding = absOffset === 0 ? "p-8" : "p-4";

                return (
                  <div
                    key={tool.name}
                    className="absolute w-full h-full transition-all duration-700 ease-out"
                    style={{
                      transform: `translateX(${transform.translateX}px) rotateY(${transform.rotateY}deg) scale(${transform.scale})`,
                      zIndex: transform.zIndex,
                      opacity: opacity,
                      filter: blur,
                      transformOrigin: "center center",
                    }}
                  >
                    <Card
                      className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${cardWidth} ${cardHeight} text-center bg-card/80 backdrop-blur-sm border border-border/50 ${padding} rounded-2xl flex flex-col justify-center items-center shadow-xl hover:shadow-2xl transition-all duration-300`}
                    >
                      <div className={`${absOffset === 0 ? 'mb-6' : 'mb-4'} p-4 rounded-full bg-gradient-to-br from-surface/50 to-background/50 backdrop-blur-sm`}>
                        <tool.icon
                          className={`${iconSize} ${tool.color} mx-auto`}
                        />
                      </div>
                      <h3 className={`${titleSize} font-bold text-primary mb-2`}>
                        {tool.brand}
                      </h3>
                      {absOffset === 0 && (
                        <p className="text-sm text-accent-gold mb-3 font-medium">
                          {tool.tagline}
                        </p>
                      )}
                      <p
                        className={`text-muted-foreground ${descSize} leading-relaxed`}
                      >
                        {tool.description}
                      </p>
                    </Card>
                  </div>
                );
              })}
            </div>
            
            {/* Navigation Dots */}
            <div className="absolute -bottom-6 flex gap-3 items-center">
              {tools.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveIndex(index)}
                  className={`transition-all duration-300 rounded-full ${
                    activeIndex === index
                      ? "w-16 h-3 bg-gradient-to-r from-accent-green to-accent-blue"
                      : "w-3 h-3 bg-surface/60 hover:bg-surface"
                  }`}
                  aria-label={`Go to tool ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </ContentSection>
      </div>
    </section>
  );
}
