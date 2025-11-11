
import React, { useEffect, useRef } from "react";

interface ContentSectionProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export default function ContentSection({ children, className = "", style = {} }: ContentSectionProps) {
  const contentRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
        }
      },
      { threshold: 0.1 }
    );

    if (contentRef.current) {
      observer.observe(contentRef.current);
    }

    return () => {
      if (contentRef.current) {
        observer.unobserve(contentRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={contentRef}
      className={`scroll-reveal ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}
