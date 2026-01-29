import React, { useState, useEffect, useRef } from 'react';
import { Brain, Rocket, Lightbulb, Search, BarChart3 } from 'lucide-react';

interface DeconstructorPhaseLoaderProps {
  onComplete: () => void;
  isReady?: boolean;
}

interface AnalysisStep {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  text: string;
  color: string;
  delay: number; // When to start typing (in ms)
  duration: number; // How long to type (in ms)
}

export const DeconstructorPhaseLoader: React.FC<DeconstructorPhaseLoaderProps> = ({ onComplete, isReady = true }) => {
  const [progress, setProgress] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [displayTexts, setDisplayTexts] = useState<string[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number>(Date.now());
  const animationFrameRef = useRef<number | null>(null);

  const totalDuration = 5000; // 5 seconds
  const steps: AnalysisStep[] = [
    {
      icon: Rocket,
      text: 'Starting MECCA analysis engine...',
      color: '#ef4444', // red
      delay: 0,
      duration: 800,
    },
    {
      icon: Lightbulb,
      text: 'Analyzing with personalized AI intelligence...',
      color: '#ec4899', // pink
      delay: 1000,
      duration: 1000,
    },
    {
      icon: Search,
      text: 'Initializing MECCA neural analysis...',
      color: '#3b82f6', // blue
      delay: 2200,
      duration: 1000,
    },
    {
      icon: BarChart3,
      text: 'Processing trading patterns and performance metrics...',
      color: '#22c55e', // green
      delay: 3400,
      duration: 1200,
    },
  ];

  // Animate progress from 0 to 100% and rotation from 0 to 360 degrees over 5 seconds
  useEffect(() => {
    const startTime = Date.now();
    startTimeRef.current = startTime;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progressPercent = Math.min((elapsed / totalDuration) * 100, 100);
      const rotationDegrees = Math.min((elapsed / totalDuration) * 360, 360);

      setProgress(progressPercent);
      setRotation(rotationDegrees);

      if (elapsed < totalDuration) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Animation complete
        setTimeout(() => {
          onComplete();
        }, 200);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [onComplete]);

  // Handle typing animations for each step
  useEffect(() => {
    const timeouts: NodeJS.Timeout[] = [];
    const intervals: NodeJS.Timeout[] = [];

    steps.forEach((step, index) => {
      // Start typing at the step's delay
      const startTimeout = setTimeout(() => {
        setCurrentStepIndex(index);
        let currentLength = 0;
        const fullText = step.text;
        const typingSpeed = Math.max(20, step.duration / fullText.length); // Minimum 20ms per character

        const typeInterval = setInterval(() => {
          currentLength++;
          if (currentLength <= fullText.length) {
            setDisplayTexts((prev) => {
              const newTexts = [...prev];
              newTexts[index] = fullText.substring(0, currentLength);
              return newTexts;
            });
          } else {
            clearInterval(typeInterval);
          }
        }, typingSpeed);

        intervals.push(typeInterval);
      }, step.delay);

      timeouts.push(startTimeout);
    });

    return () => {
      timeouts.forEach(clearTimeout);
      intervals.forEach(clearInterval);
    };
  }, []);

  // Auto-scroll to bottom when new text appears (without showing scrollbar)
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [displayTexts]);

  const greenAccent = {
    primary: '#22c55e',
    glow: 'rgba(34, 197, 94, 0.4)',
  };

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-md px-6 py-8">
      {/* Brain Icon with Rings */}
      <div 
        className="relative mb-8 flex items-center justify-center"
        style={{
          width: '220px',
          height: '220px',
        }}
      >
        {/* Outer pulsating dashed ring - rotates 0 to 360 degrees in 5 seconds (back layer, behind brain) */}
        <div
          className="absolute"
          style={{
            width: '200px',
            height: '200px',
            top: '50%',
            left: '50%',
            transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
            transformOrigin: 'center center',
            zIndex: 1,
          }}
        >
          <div
            className="absolute inset-0 rounded-full border-2"
            style={{
              borderColor: greenAccent.primary,
              borderStyle: 'dashed',
              boxShadow: `0 0 40px ${greenAccent.glow}`,
              animation: 'pulse-ring-opacity 2s cubic-bezier(0.4, 0, 0.6, 1) infinite, pulse-ring-scale 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }}
          />
        </div>
        
        {/* Inner solid ring - rotates 0 to 360 degrees in 5 seconds (middle layer, behind brain) */}
        <div
          className="absolute rounded-full border-4"
          style={{
            width: '160px',
            height: '160px',
            borderColor: greenAccent.primary,
            borderStyle: 'solid',
            opacity: 0.6,
            boxShadow: `0 0 30px ${greenAccent.glow}`,
            top: '50%',
            left: '50%',
            transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
            transformOrigin: 'center center',
            zIndex: 2,
          }}
        />
        
        {/* Progress circle (animated from 0 to 360 degrees in 5 seconds) - front layer, behind brain */}
        <svg
          className="absolute"
          style={{
            width: '180px',
            height: '180px',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%) rotate(-90deg)',
            transformOrigin: 'center center',
            zIndex: 3,
          }}
          viewBox="0 0 180 180"
        >
          <circle
            cx="90"
            cy="90"
            r="80"
            fill="none"
            stroke={greenAccent.primary}
            strokeWidth="4"
            strokeDasharray={`${2 * Math.PI * 80}`}
            strokeDashoffset={`${2 * Math.PI * 80 * (1 - progress / 100)}`}
            strokeLinecap="round"
            style={{
              filter: `drop-shadow(0 0 8px ${greenAccent.glow})`,
            }}
          />
        </svg>

        {/* Brain Icon - Centered in the middle of all rings (top layer, in front of everything) */}
        <div
          className="absolute flex items-center justify-center"
          style={{
            width: '120px',
            height: '120px',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            transformOrigin: 'center center',
            zIndex: 20,
          }}
        >
          <Brain
            className="w-16 h-16 brain-icon-animated"
            style={{
              color: greenAccent.primary,
              filter: `drop-shadow(0 0 12px ${greenAccent.glow})`,
            }}
          />
        </div>
      </div>

      {/* Progress Percentage */}
      <div className="mb-2">
        <span
          className="text-5xl font-bold"
          style={{
            color: greenAccent.primary,
            textShadow: `0 0 20px ${greenAccent.glow}`,
            fontFamily: 'monospace',
          }}
        >
          {Math.round(progress)}%
        </span>
      </div>

      {/* Subtitle */}
      <div className="mb-8">
        <p
          className="text-base font-medium"
          style={{
            color: '#ffffff',
            opacity: 0.9,
          }}
        >
          Analyzing your screenshots...
        </p>
      </div>

      {/* Analysis Steps List */}
      <div
        ref={scrollContainerRef}
        className="w-full rounded-xl p-4 space-y-3"
        style={{
          background: 'rgba(30, 30, 30, 0.6)',
          backdropFilter: 'blur(10px)',
          maxHeight: '200px',
          overflowY: 'auto',
          scrollbarWidth: 'none', // Firefox
          msOverflowStyle: 'none', // IE/Edge
        }}
      >
        <style>{`
          div::-webkit-scrollbar {
            display: none; /* Chrome, Safari, Opera */
          }
        `}</style>
        
        {steps.map((step, index) => {
          const IconComponent = step.icon;
          const displayText = displayTexts[index] || '';
          const isActive = currentStepIndex === index && displayText.length < step.text.length;
          const isComplete = displayText === step.text;

          if (displayText === '' && currentStepIndex < index) {
            return null; // Don't render steps that haven't started yet
          }

          return (
            <div
              key={index}
              className="flex items-start gap-3 transition-opacity duration-300"
              style={{
                opacity: displayText === '' ? 0 : 1,
              }}
            >
              <div
                className="flex-shrink-0 mt-0.5"
                style={{
                  color: step.color,
                }}
              >
                <IconComponent className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-medium"
                  style={{
                    color: '#ffffff',
                    opacity: isComplete ? 1 : 0.8,
                  }}
                >
                  {displayText}
                  {isActive && (
                    <span
                      className="inline-block w-1 h-4 ml-1 animate-pulse"
                      style={{
                        background: step.color,
                        verticalAlign: 'middle',
                      }}
                    />
                  )}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes pulse-ring-opacity {
          0%, 100% {
            opacity: 0.4;
          }
          50% {
            opacity: 0.6;
          }
        }

        @keyframes pulse-ring-scale {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }

        @keyframes brain-think {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.9;
          }
        }

        .brain-icon-animated {
          animation: brain-think 1.5s ease-in-out infinite;
          transform-origin: center center;
        }
      `}</style>
    </div>
  );
};
