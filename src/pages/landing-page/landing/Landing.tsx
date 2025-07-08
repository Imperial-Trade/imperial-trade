
import React from "react";
import HeroSection from "@/components/landing/HeroSection";
import StatsSection from "@/components/landing/StatsSection";
import FeatureCarousel from "@/components/landing/FeatureCarousel";
import ToolsShowcase from "@/components/landing/ToolsShowcase";
import FinalCTA from "@/components/landing/FinalCTA";

export default function Landing() {
  return (
    <div className="bg-background text-white w-full overflow-x-hidden">
      {/* Full Screen Video Background */}
      <div className="fixed inset-0 w-screen h-screen overflow-hidden z-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
          style={{ filter: "brightness(0.3)" }}
        >
          <source
            src="https://videos.pexels.com/video-files/3209828/3209828-hd_1920_1080_25fps.mp4"
            type="video/mp4"
          />
          <source
            src="https://videos.pexels.com/video-files/7578540/7578540-hd_1920_1080_25fps.mp4"
            type="video/mp4"
          />
        </video>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
      </div>

      <HeroSection />
      <StatsSection />
      <FeatureCarousel />
      <ToolsShowcase />
      <FinalCTA />

      {/* Styles */}
      <style>{`
        .animate-fade-in {
          animation: fadeIn 0.7s ease-in-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        /* AI Tech Font Styles */
        .imperial-tech-font {
          font-family: 'Orbitron', 'Courier New', monospace;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          background: linear-gradient(135deg, #e6d3b3, #c09a58);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-shadow: 0 0 20px rgba(192, 154, 88, 0.4);
          position: relative;
        }

        .imperial-tech-font::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(90deg, transparent, rgba(192, 154, 88, 0.3), transparent);
          animation: tech-scan 3s infinite;
          pointer-events: none;
        }

        @keyframes tech-scan {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        /* Load Orbitron font */
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
      `}</style>
    </div>
  );
}
