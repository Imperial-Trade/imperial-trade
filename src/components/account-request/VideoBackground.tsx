
import React from "react";

export const VideoBackground: React.FC = () => {
  return (
    <>
      <video
        autoPlay
        loop
        muted
        playsInline
        className="fixed inset-0 w-full h-full object-cover z-0 pointer-events-none"
        style={{ 
          filter: "brightness(0.4) dark:brightness(0.4) brightness(0.7)",
          top: "calc(-1 * var(--safe-area-top))", /* Extend behind status bar */
          height: "calc(100vh + var(--safe-area-top))" /* Full height including status bar */
        }}
      >
        <source
          src="https://videos.pexels.com/video-files/3209828/3209828-hd_1920_1080_25fps.mp4"
          type="video/mp4"
        />
      </video>
      <div className="fixed inset-0 bg-black/50 dark:bg-black/50 bg-black/30 backdrop-blur-[1px] z-10 pointer-events-none"></div>
    </>
  );
};
