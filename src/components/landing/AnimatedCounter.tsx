
import React, { useState, useEffect, useRef } from "react";

interface AnimatedCounterProps {
  value: string | number;
  duration?: number;
  suffix?: string;
}

export default function AnimatedCounter({ value, duration = 3000, suffix = "" }: AnimatedCounterProps) {
  const [count, setCount] = useState(0);
  const counterRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setCount(0);

          const numericValue = parseFloat(
            value.toString().replace(/[^0-9.]/g, "")
          );

          let startTime = null;
          const animate = (currentTime) => {
            if (!startTime) startTime = currentTime;
            const progress = Math.min((currentTime - startTime) / duration, 1);

            const easeOut = 1 - Math.pow(1 - progress, 3);
            const currentValue = Math.floor(easeOut * numericValue);

            setCount(currentValue);

            if (progress < 1) {
              requestAnimationFrame(animate);
            } else {
              setCount(numericValue);
            }
          };

          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );

    if (counterRef.current) {
      observer.observe(counterRef.current);
    }

    return () => {
      if (counterRef.current) {
        observer.unobserve(counterRef.current);
      }
    };
  }, [value, duration]);

  const formatNumber = (num) => {
    if (num >= 1000) {
      return num.toLocaleString();
    }
    return num.toString();
  };

  return (
    <div ref={counterRef} className="text-3xl font-bold text-primary mb-1">
      {formatNumber(count)}
      {suffix}
    </div>
  );
}
