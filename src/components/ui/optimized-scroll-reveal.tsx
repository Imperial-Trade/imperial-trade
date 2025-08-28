
import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function OptimizedScrollReveal({ children, className, delay = 0 }: OptimizedScrollRevealProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            setIsVisible(true);
          }, delay);
        }
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [delay]);

  return (
    <div
      ref={ref}
      className={cn(
        'transition-all duration-1000 ease-out will-change-transform',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10',
        className
      )}
      style={{ 
        transitionDelay: `${delay}ms`,
        transform: `translateY(${isVisible ? 0 : 10}px)`, // Use transform instead of utility classes
        contain: 'layout style paint' // Optimize rendering
      }}
    >
      {children}
    </div>
  );
}
