
import React from "react";
import { Users, TrendingUp, BookOpen, Award } from "lucide-react";
import ContentSection from "./ContentSection";
import AnimatedCounter from "./AnimatedCounter";

export default function StatsSection() {
  const stats = [
    {
      icon: Users,
      label: "Active Members",
      value: "200",
      suffix: "+",
      color: "text-accent-green",
    },
    {
      icon: TrendingUp,
      label: "Productivity Rate",
      value: "80",
      suffix: "%",
      color: "text-accent-blue",
    },
    {
      icon: BookOpen,
      label: "Educational Videos",
      value: "50",
      suffix: "+",
      color: "text-accent-gold",
    },
    {
      icon: Award,
      label: "IB Rebate up to",
      value: "20",
      suffix: "/lot",
      color: "text-accent-red",
    },
  ];

  return (
    <section className="w-full bg-surface py-12 sm:py-16 md:py-20 z-10 relative overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
        <ContentSection>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8 text-center">
            {stats.map((stat) => (
              <div key={stat.label} className="px-2">
                <stat.icon
                  className={`w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 ${stat.color} mx-auto mb-2 sm:mb-3`}
                />
                <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                <div className="text-xs sm:text-sm text-white/80 uppercase tracking-wider sm:tracking-widest font-medium px-1">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </ContentSection>
      </div>
    </section>
  );
}
