
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Crown, ChevronDown } from "lucide-react";
import ContentSection from "./ContentSection";

export default function HeroSection() {
  return (
    <div className="bg-background text-primary w-full overflow-x-hidden">
      {/* Full Screen Video Background */}
      <div className="fixed inset-0 w-screen h-screen overflow-hidden z-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover dark:brightness-[0.4] light:brightness-[0.8] transition-all duration-300"
        >
          <source src="https://videos.pexels.com/video-files/3209828/3209828-hd_1920_1080_25fps.mp4" type="video/mp4" />
          <source src="https://videos.pexels.com/video-files/7578540/7578540-hd_1920_1080_25fps.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
      </div>

      {/* Hero Section */}
      <section className="relative h-screen flex flex-col items-center justify-start text-center pt-24 sm:pt-32 overflow-x-hidden">
        <ContentSection>
          <div className="relative flex justify-center mb-8 z-10">
            <div className="w-24 h-24 bg-surface/90 backdrop-blur-md rounded-3xl flex items-center justify-center glow-effect-gold shadow-2xl">
              <Crown className="w-16 h-16 text-accent-gold" />
            </div>
          </div>
                   
          <h1 className="text-6xl lg:text-8xl font-black mb-4 uppercase text-white relative z-10">
            <span className="imperial-tech-font">IMPERIAL</span>
          </h1>
          <p className="text-xl lg:text-2xl text-white mb-10 max-w-3xl mx-auto relative z-10 px-4">
            Ascend to the Apex of Trading.
            <br />
            Premium Education, Live Mentorship, and Professional Partnership Programs.
          </p>
        </ContentSection>
                 
        {/* Scroll Down Indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10">
          <div className="text-lg text-white/80">Scroll to begin your journey.</div>
          <div className="animate-bounce mt-4 flex justify-center">
              <ChevronDown className="w-8 h-8 text-white/80" />
          </div>
        </div>
      </section>
    </div>
  );
}