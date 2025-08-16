
import React from "react";
import { useIsMobile } from "@/hooks/use-mobile";

export const VideoBackground: React.FC = () => {
  const isMobile = useIsMobile();

  return (
    <>
      <video
        autoPlay
        loop
        muted
        playsInline
        className="fixed inset-0 w-full h-full object-cover z-0 pointer-events-none"
        style={{ 
          filter: isMobile ? "brightness(0.6)" : "brightness(0.4) dark:brightness(0.4) brightness(0.7)",
          // Enhanced mobile video performance
          willChange: 'transform',
          transform: 'translate3d(0, 0, 0)'
        }}
      >
        <source
          src="https://videos.pexels.com/video-files/3209828/3209828-hd_1920_1080_25fps.mp4"
          type="video/mp4"
        />
      </video>
      <div className={`fixed inset-0 backdrop-blur-[1px] z-10 pointer-events-none ${
        isMobile 
          ? 'bg-black/20 dark:bg-black/20' 
          : 'bg-black/50 dark:bg-black/50 bg-black/30'
      }`}></div>
    </>
  );
};
