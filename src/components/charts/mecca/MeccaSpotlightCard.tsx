import React, { useRef, useState, useEffect } from 'react';

interface MeccaSpotlightCardProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
  onClick?: () => void;
  glowColor?: 'emerald' | 'gold' | 'blue' | 'purple';
  enableAurora?: boolean;
  enableTilt?: boolean;
  /** 'journal' = match Journal XX SpotlightCard exactly (border rgba(255,255,255,0.1), no aurora, no accent) */
  variant?: 'journal' | 'mecca';
}

// Premium color configurations
const glowColors = {
  emerald: {
    spotlight: 'rgba(34, 197, 94, 0.15)',
    border: 'rgba(34, 197, 94, 0.2)',
    aurora1: 'rgba(34, 197, 94, 0.3)',
    aurora2: 'rgba(16, 185, 129, 0.2)',
    aurora3: 'rgba(52, 211, 153, 0.15)',
  },
  gold: {
    spotlight: 'rgba(234, 179, 8, 0.15)',
    border: 'rgba(234, 179, 8, 0.2)',
    aurora1: 'rgba(234, 179, 8, 0.3)',
    aurora2: 'rgba(245, 158, 11, 0.2)',
    aurora3: 'rgba(251, 191, 36, 0.15)',
  },
  blue: {
    spotlight: 'rgba(59, 130, 246, 0.15)',
    border: 'rgba(59, 130, 246, 0.2)',
    aurora1: 'rgba(59, 130, 246, 0.3)',
    aurora2: 'rgba(99, 102, 241, 0.2)',
    aurora3: 'rgba(139, 92, 246, 0.15)',
  },
  purple: {
    spotlight: 'rgba(168, 85, 247, 0.15)',
    border: 'rgba(168, 85, 247, 0.2)',
    aurora1: 'rgba(168, 85, 247, 0.3)',
    aurora2: 'rgba(139, 92, 246, 0.2)',
    aurora3: 'rgba(192, 132, 252, 0.15)',
  },
};

export const MeccaSpotlightCard: React.FC<MeccaSpotlightCardProps> = ({
  children,
  className = '',
  noPadding = false,
  onClick,
  glowColor = 'emerald',
  enableAurora = true,
  enableTilt = false,
  variant = 'mecca',
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [tiltValues, setTiltValues] = useState({ x: 0, y: 0 });
  const [auroraPosition, setAuroraPosition] = useState(0);

  const isJournal = variant === 'journal';
  const colors = glowColors[glowColor];

  // Aurora: only for mecca variant
  useEffect(() => {
    if (isJournal || !enableAurora) return;
    const interval = setInterval(() => setAuroraPosition((p) => (p + 1) % 360), 50);
    return () => clearInterval(interval);
  }, [enableAurora, isJournal]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setPosition({ x, y });

    if (enableTilt) {
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const tiltX = ((y - centerY) / centerY) * -2;
      const tiltY = ((x - centerX) / centerX) * 2;
      setTiltValues({ x: tiltX, y: tiltY });
    }
  };

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => {
    setIsHovered(false);
    setTiltValues({ x: 0, y: 0 });
  };

  const heightClass = className.includes('h-fit') ? '' : 'h-full';

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className={`relative rounded-3xl transition-all duration-300 ease-out group ${className}`}
      style={{
        transform: enableTilt
          ? `perspective(1000px) rotateX(${tiltValues.x}deg) rotateY(${tiltValues.y}deg)`
          : 'none',
      }}
    >
      {/* Aurora (mecca only) */}
      {!isJournal && enableAurora && (
        <div
          className="absolute -inset-[1px] rounded-3xl opacity-[0.25] group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: `conic-gradient(from ${auroraPosition}deg at 50% 50%, ${colors.aurora1}, ${colors.aurora2}, ${colors.aurora3}, transparent, ${colors.aurora1})`,
            filter: 'blur(10px)',
          }}
        />
      )}

      {/* Border: journal = Journal XX (rgba 255,255,255,0.1); mecca = emerald tint */}
      <div
        className="absolute inset-0 rounded-3xl pointer-events-none z-0"
        style={{
          background: isJournal ? 'rgba(255,255,255,0.1)' : (isHovered ? colors.border : 'rgba(34, 197, 94, 0.2)'),
          boxShadow: isJournal ? 'none' : (isHovered ? `0 0 20px ${colors.aurora1}40` : `0 0 12px rgba(34, 197, 94, 0.12)`),
        }}
      />

      {/* Spotlight on hover (Journal: bronze rgba(205,127,50,0.15); mecca: emerald) */}
      <div
        className="absolute inset-0 rounded-3xl pointer-events-none z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `radial-gradient(800px circle at ${position.x}px ${position.y}px, ${isJournal ? 'rgba(205,127,50,0.15)' : colors.spotlight}, transparent 40%)`,
        }}
      />

      {/* Inner: Journal XX uses bg #0A0A0A, rounded-[23px], p-6 or noPadding */}
      <div className={`relative w-full p-[1px] rounded-3xl z-10 ${heightClass}`}>
        <div
          className={`relative w-full bg-[#0A0A0A] rounded-[23px] overflow-hidden flex flex-col ${heightClass} ${noPadding ? '' : 'p-6'}`}
          style={{
            boxShadow: isJournal ? 'none' : (isHovered ? `0 8px 32px rgba(0,0,0,0.4), 0 0 60px ${colors.spotlight}` : '0 4px 24px rgba(0,0,0,0.3)'),
          }}
        >
          {/* Accent bar: mecca only */}
          {!isJournal && (
            <div className="absolute top-0 left-0 right-0 h-[3px] pointer-events-none rounded-t-[23px]" style={{ background: 'linear-gradient(90deg, rgba(34,197,94,0.5), rgba(234,179,8,0.5), rgba(34,197,94,0.5))' }} />
          )}
          {children}
        </div>
      </div>
    </div>
  );
};

// Premium animated loading skeleton
export const MeccaSkeleton: React.FC<{ className?: string; variant?: 'text' | 'rect' | 'circle' }> = ({
  className = '',
  variant = 'rect',
}) => {
  const baseClass = 'animate-pulse bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 bg-[length:200%_100%] animate-shimmer';
  
  const variantClass = {
    text: 'h-4 rounded',
    rect: 'rounded-xl',
    circle: 'rounded-full',
  };

  return <div className={`${baseClass} ${variantClass[variant]} ${className}`} />;
};

// Animated number component for price tickers
export const AnimatedNumber: React.FC<{
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  duration?: number;
}> = ({ value, decimals = 2, prefix = '', suffix = '', className = '', duration = 500 }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);
  const previousValue = useRef(value);

  useEffect(() => {
    if (previousValue.current === value) return;

    setIsAnimating(true);
    const startValue = previousValue.current;
    const endValue = value;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out cubic)
      const eased = 1 - Math.pow(1 - progress, 3);
      
      const currentValue = startValue + (endValue - startValue) * eased;
      setDisplayValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
        previousValue.current = value;
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  const isPositive = value >= (previousValue.current || 0);

  return (
    <span
      className={`font-mono tabular-nums transition-colors duration-200 ${className}`}
      style={{
        color: isAnimating ? (isPositive ? '#22c55e' : '#ef4444') : undefined,
      }}
    >
      {prefix}
      {displayValue.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
};

// Particle burst effect for success states
export const ParticleBurst: React.FC<{ trigger: boolean; color?: string }> = ({
  trigger,
  color = '#22c55e',
}) => {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; angle: number }>>([]);

  useEffect(() => {
    if (trigger) {
      const newParticles = Array.from({ length: 12 }, (_, i) => ({
        id: Date.now() + i,
        x: 50,
        y: 50,
        angle: (i * 30) + Math.random() * 15,
      }));
      setParticles(newParticles);

      setTimeout(() => setParticles([]), 1000);
    }
  }, [trigger]);

  if (particles.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute w-2 h-2 rounded-full animate-particle-burst"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            backgroundColor: color,
            '--particle-angle': `${particle.angle}deg`,
            boxShadow: `0 0 6px ${color}`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
};

// Typing effect for AI insights
export const TypewriterText: React.FC<{
  text: string;
  speed?: number;
  className?: string;
  onComplete?: () => void;
}> = ({ text, speed = 20, className = '', onComplete }) => {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setDisplayText('');
    setCurrentIndex(0);
  }, [text]);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText((prev) => prev + text[currentIndex]);
        setCurrentIndex((prev) => prev + 1);
      }, speed);

      return () => clearTimeout(timeout);
    } else if (currentIndex === text.length && onComplete) {
      onComplete();
    }
  }, [currentIndex, text, speed, onComplete]);

  return (
    <span className={className}>
      {displayText}
      {currentIndex < text.length && (
        <span className="inline-block w-[2px] h-[1em] bg-emerald-400 animate-pulse ml-0.5" />
      )}
    </span>
  );
};

// Premium progress bar with gradient
export const GradientProgress: React.FC<{
  value: number;
  max?: number;
  className?: string;
  showLabel?: boolean;
}> = ({ value, max = 100, className = '', showLabel = false }) => {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div className={`relative ${className}`}>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out relative overflow-hidden"
          style={{
            width: `${percentage}%`,
            background: 'linear-gradient(90deg, #22c55e, #16a34a, #22c55e)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 2s infinite linear',
          }}
        >
          {/* Shimmer overlay */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
              animation: 'shimmer 1.5s infinite',
            }}
          />
        </div>
      </div>
      {showLabel && (
        <span className="absolute right-0 -top-5 text-xs font-medium text-emerald-400">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
};

export default MeccaSpotlightCard;
