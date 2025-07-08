
import React, { useEffect, useRef, useState } from "react";

interface ParallaxSectionProps {
  children: React.ReactNode;
  videoSrc?: string;
  isFirst?: boolean;
}

export default function ParallaxSection({ children, videoSrc, isFirst = false }: ParallaxSectionProps) {
  const bgRef = useRef(null);
  const [offsetY, setOffsetY] = useState(0);

  const handleScroll = () => {
    if (window.innerWidth > 768) {
      const scrollPosition = window.pageYOffset;
      const elementTop = bgRef.current?.parentElement.offsetTop || 0;
      const relativeScroll = scrollPosition - elementTop;
      setOffsetY(relativeScroll * 0.3);
    }
  };

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section className="parallax-container">
      {videoSrc && (
        <video
          autoPlay
          loop
          muted
          playsInline
          className="parallax-bg"
          style={{ objectFit: "cover" }}
        >
          <source src={videoSrc} type="video/mp4" />
        </video>
      )}
      <div className="content-overlay">{children}</div>
    </section>
  );
}
