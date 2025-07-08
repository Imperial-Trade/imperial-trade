
import React from "react";

export const VideoBackground: React.FC = () => {
  return (
    <>
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute z-0 w-auto min-w-full min-h-full max-w-none object-cover"
        style={{ filter: "brightness(0.4)" }}
      >
        <source
          src="https://videos.pexels.com/video-files/3209828/3209828-hd_1920_1080_25fps.mp4"
          type="video/mp4"
        />
      </video>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] z-10"></div>
    </>
  );
};
