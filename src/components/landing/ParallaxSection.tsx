
import React, { useEffect, useRef, useState } from "react";

interface ParallaxSectionProps {
  children: React.ReactNode;
  videoSrc?: string;
  isFirst?: boolean;
}

export default function ParallaxSection({ children, videoSrc, isFirst = false }: ParallaxSectionProps) {
  const bgRef = useRef<HTMLVideoElement | null>(null);
  const [offsetY, setOffsetY] = useState(0);

  const handleScroll = () => {
    if (window.innerWidth > 768) {
      const scrollPosition = window.pageYOffset;
      const elementTop = (bgRef.current?.parentElement as HTMLElement | null)?.offsetTop || 0;
      const relativeScroll = scrollPosition - elementTop;
      setOffsetY(relativeScroll * 0.15);
    }
  };

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section className="relative">
      {videoSrc && (
        <video
          autoPlay
          loop
          muted
          playsInline
          ref={bgRef}
          className="absolute inset-0 h-full w-full object-cover -z-10"
          style={{ transform: `translateY(${offsetY}px)` }}
        >
          <source src={videoSrc} type="video/mp4" />
        </video>
      )}
      <div className="relative">
        {children}
      </div>
    </section>
  );
}
