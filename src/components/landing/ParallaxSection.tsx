
import React, { useEffect, useRef, useState } from "react";

interface ParallaxSectionProps {
  children: React.ReactNode;
  videoSrc?: string;
  isFirst?: boolean;
  speed?: number;
  className?: string;
}

export default function ParallaxSection({ 
  children, 
  videoSrc, 
  isFirst = false, 
  speed = 0.5,
  className = ""
}: ParallaxSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [offsetY, setOffsetY] = useState(0);

  const handleScroll = () => {
    if (window.innerWidth > 768 && sectionRef.current) {
      const scrollPosition = window.pageYOffset;
      const elementTop = sectionRef.current.offsetTop;
      const elementHeight = sectionRef.current.offsetHeight;
      const windowHeight = window.innerHeight;
      
      // Check if element is in viewport
      if (scrollPosition + windowHeight > elementTop && scrollPosition < elementTop + elementHeight) {
        const relativeScroll = scrollPosition - elementTop + windowHeight;
        setOffsetY(relativeScroll * speed);
      }
    }
  };

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Initial call
    return () => window.removeEventListener("scroll", handleScroll);
  }, [speed]);

  return (
    <section 
      ref={sectionRef}
      className={`relative overflow-hidden ${className}`}
      style={{
        transform: `translateY(${offsetY}px)`,
        transition: 'transform 0.1s ease-out'
      }}
    >
      {videoSrc && (
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectFit: "cover" }}
        >
          <source src={videoSrc} type="video/mp4" />
        </video>
      )}
      <div className="relative z-10">{children}</div>
    </section>
  );
}
