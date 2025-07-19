
import React, { useState, useEffect } from "react";
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

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prevIndex) => (prevIndex + 1) % tools.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <ContentSection>
      <div className="h-[320px] relative flex flex-col items-center justify-center">
        <div
          className="relative w-full h-[280px]"
          style={{ perspective: "1500px" }}
        >
          {tools.map((tool, index) => {
            const offset = index - activeIndex;
            const sign = Math.sign(offset);
            const absOffset = Math.abs(offset);

            const isBehind = Math.abs(offset) > tools.length / 2;
            const displayOffset = isBehind
              ? (tools.length - absOffset) * -sign
              : offset;

            const transform = {
              rotateY: displayOffset * -20,
              translateX: displayOffset * 180,
              scale: absOffset === 0 ? 1.2 : 0.6,
              zIndex: tools.length - absOffset,
            };

            const opacity = absOffset <= 2 ? 1 : 0;
            const blur = absOffset === 0 ? "blur(0)" : "blur(3px)";

            const cardWidth = absOffset === 0 ? "w-[450px]" : "w-80";
            const cardHeight = absOffset === 0 ? "h-64" : "h-48";
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
                  className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${cardWidth} ${cardHeight} text-center bg-background/50 border-default ${padding} rounded-2xl flex flex-col justify-center items-center`}
                >
                  <tool.icon
                    className={`${iconSize} ${tool.color} mx-auto mb-4`}
                  />
                  <h3 className={`${titleSize} font-bold text-primary mb-3`}>
                    {tool.name}
                  </h3>
                  <p
                    className={`text-secondary ${descSize} leading-relaxed text-white`}
                  >
                    {tool.description}
                  </p>
                </Card>
              </div>
            );
          })}
        </div>
        <div className="absolute -bottom-2 flex gap-3 items-center">
          {tools.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveIndex(index)}
              className={`transition-all duration-300 rounded-full ${
                activeIndex === index
                  ? "w-16 h-3 bg-accent-green"
                  : "w-3 h-3 bg-surface"
              }`}
              aria-label={`Go to tool ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </ContentSection>
  );
}
