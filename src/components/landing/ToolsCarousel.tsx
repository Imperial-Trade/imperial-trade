
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Brain, Search, Calculator, BookOpen, BarChart, Activity } from "lucide-react";
import { Card } from "@/components/ui/card";
import ContentSection from "./ContentSection";

const tools = [
  {
    name: "AI Analyst",
    icon: Brain,
    description:
      "Get AI-powered breakdowns of your trade history, identify strengths, and pinpoint areas for improvement.",
    color: "text-purple-400",
  },
  {
    name: "AI Scanner",
    icon: Search,
    description:
      "Scan markets 24/7 for high-probability setups across various assets. Never miss a potential trade again.",
    color: "text-blue-400",
  },
  {
    name: "Risk Calculator",
    icon: Calculator,
    description:
      "Calculate the perfect position size in seconds. Manage your risk precisely for any instrument and trade.",
    color: "text-green-400",
  },
  {
    name: "Trading Journal",
    icon: BookOpen,
    description:
      "Log trades and get AI-powered encouragement and constructive feedback to refine your strategy.",
    color: "text-orange-400",
  },
  {
    name: "Performance Analytics",
    icon: BarChart,
    description:
      "Visualize your trading performance with in-depth charts, heatmaps, and customizable metrics.",
    color: "text-pink-400",
  },
  {
    name: "Risk Simulator",
    icon: Activity,
    description:
      "Simulate trade setups to analyze risk before you enter the market, testing different scenarios.",
    color: "text-red-400",
  },
];

export default function ToolsCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);

  // Memoize the carousel rotation function to prevent recreation
  const rotateCarousel = useCallback(() => {
    setActiveIndex((prevIndex) => (prevIndex + 1) % tools.length);
  }, []);

  // Stable interval with longer duration to reduce render frequency
  useEffect(() => {
    const interval = setInterval(rotateCarousel, 6000); // Increased from 4s to 6s
    return () => clearInterval(interval);
  }, [rotateCarousel]);

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

                // Memoize transform calculations to reduce computation
                const transformValues = useMemo(() => {
                  const isBehind = Math.abs(offset) > tools.length / 2;
                  const displayOffset = isBehind
                    ? (tools.length - absOffset) * -sign
                    : offset;

                  return {
                    rotateY: displayOffset * -20,
                    translateX: displayOffset * 200,
                    scale: absOffset === 0 ? 1.2 : 0.7,
                    zIndex: tools.length - absOffset,
                    opacity: absOffset <= 2 ? 1 : 0,
                    blur: absOffset === 0 ? "blur(0)" : "blur(2px)",
                  };
                }, [offset, absOffset, sign]);

                // Memoize CSS classes to prevent string recalculation
                const cardClasses = useMemo(() => ({
                  cardWidth: absOffset === 0 ? "w-[480px]" : "w-80",
                  cardHeight: absOffset === 0 ? "h-72" : "h-52",
                  iconSize: absOffset === 0 ? "w-16 h-16" : "w-10 h-10",
                  titleSize: absOffset === 0 ? "text-2xl" : "text-lg",
                  descSize: absOffset === 0 ? "text-base" : "text-sm",
                  padding: absOffset === 0 ? "p-8" : "p-4",
                }), [absOffset]);

                return (
                  <div
                    key={tool.name}
                    className="absolute w-full h-full will-change-transform"
                    style={{
                      transform: `translateX(${transformValues.translateX}px) rotateY(${transformValues.rotateY}deg) scale(${transformValues.scale})`,
                      zIndex: transformValues.zIndex,
                      opacity: transformValues.opacity,
                      filter: transformValues.blur,
                      transformOrigin: "center center",
                      transition: "transform 0.7s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.7s ease-out, filter 0.7s ease-out",
                    }}
                  >
                    <Card
                      className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${cardClasses.cardWidth} ${cardClasses.cardHeight} text-center bg-card/80 backdrop-blur-sm border border-border/50 ${cardClasses.padding} rounded-2xl flex flex-col justify-center items-center shadow-xl hover:shadow-2xl transition-shadow duration-300`}
                    >
                      <div className={`${absOffset === 0 ? 'mb-6' : 'mb-4'} p-4 rounded-full bg-gradient-to-br from-surface/50 to-background/50 backdrop-blur-sm`}>
                        <tool.icon
                          className={`${cardClasses.iconSize} ${tool.color} mx-auto`}
                        />
                      </div>
                      <h3 className={`${cardClasses.titleSize} font-bold text-primary mb-3`}>
                        {tool.name}
                      </h3>
                      <p
                        className={`text-muted-foreground ${cardClasses.descSize} leading-relaxed`}
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
