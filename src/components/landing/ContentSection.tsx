import { useEffect, useRef, ReactNode, CSSProperties } from "react";

interface ContentSectionProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
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
