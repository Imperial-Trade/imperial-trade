
import React from "react";
import { Crown } from "lucide-react";

export const BrandHeader: React.FC = () => {
  return (
    <div className="flex items-center justify-center mb-8">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-surface/90 rounded-2xl flex items-center justify-center glow-effect-gold backdrop-blur-md shadow-2xl">
          <Crown className="w-10 h-10 text-primary" />
        </div>
        <div>
          <h1 className="text-4xl font-bold imperial-tech-font drop-shadow-lg">
            IMPERIAL
          </h1>
          <p className="text-lg text-white/90 drop-shadow-md">
            Trading Community
          </p>
        </div>
      </div>
    </div>
  );
};
