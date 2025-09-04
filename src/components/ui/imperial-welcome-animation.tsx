import React, { useState, useEffect, useRef } from 'react';

interface ImperialWelcomeAnimationProps {
  onComplete?: () => void;
}

export const ImperialWelcomeAnimation: React.FC<ImperialWelcomeAnimationProps> = ({ onComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>();
  
  const [isVisible, setIsVisible] = useState(true);

  const tagline = "the imperial experience awaits.";

  // Updated timeline with longer pause and dots animation
  const timeline = {
    typewriter_start: 0,     // Start immediately
    typewriter_end: 3000,    // 3 seconds for typing
    pause_start: 3000,       // Pause starts after typing
    pause_end: 7000,         // 4 second pause (3-7 seconds)
    opening_start: 7000,     // Opening effect starts
    opening_end: 8500,       // 1.5 seconds for opening
    complete: 8500           // Total animation time
  };

  // Apple-style easing function
  const easeInOutCubic = (t: number): number => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };

  const easeOutQuart = (t: number): number => {
    return 1 - Math.pow(1 - t, 4);
  };

  const easeInOutQuart = (t: number): number => {
    return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
  };

  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      // Use full viewport dimensions for proper centering
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
  };

  // Typewriter effect for tagline
  const drawTypewriter = (ctx: CanvasRenderingContext2D, progress: number) => {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    const charsToShow = Math.floor(tagline.length * progress);
    const displayText = tagline.substring(0, charsToShow);
    
    ctx.font = `300 ${Math.min(ctx.canvas.width * 0.06, 80)}px -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    ctx.fillText(displayText, ctx.canvas.width / 2, ctx.canvas.height / 2);
    
    // Cursor effect
    if (progress < 1) {
      const cursorOpacity = Math.sin(Date.now() * 0.01) * 0.5 + 0.5;
      ctx.fillStyle = `rgba(255, 255, 255, ${cursorOpacity})`;
      const textWidth = ctx.measureText(displayText).width;
      ctx.fillRect(ctx.canvas.width / 2 + textWidth / 2 + 5, ctx.canvas.height / 2 - 20, 3, 40);
    }
  };

  // Pause phase with animated dots
  const drawPause = (ctx: CanvasRenderingContext2D, elapsedTime: number) => {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Main text
    ctx.font = `300 ${Math.min(ctx.canvas.width * 0.06, 80)}px -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    ctx.fillText(tagline, ctx.canvas.width / 2, ctx.canvas.height / 2);
    
    // Animated dots below the text
    const dotStartY = ctx.canvas.height / 2 + 60;
    const dotSize = 8;
    const dotSpacing = 20;
    const animationSpeed = 800; // milliseconds per cycle
    
    // Calculate which dot should be active based on time
    const cycleTime = elapsedTime % animationSpeed;
    const activeDot = Math.floor((cycleTime / animationSpeed) * 4);
    
    // Draw 4 dots
    for (let i = 0; i < 4; i++) {
      const dotX = ctx.canvas.width / 2 - (1.5 * dotSpacing) + (i * dotSpacing);
      const isActive = i === activeDot;
      
      ctx.beginPath();
      ctx.arc(dotX, dotStartY, dotSize, 0, Math.PI * 2);
      ctx.fillStyle = isActive ? 'rgba(255, 255, 255, 1)' : 'rgba(255, 255, 255, 0.3)';
      ctx.fill();
    }
  };

  // Opening effect - dramatic fade out with scale
  const drawOpening = (ctx: CanvasRenderingContext2D, progress: number) => {
    const easedProgress = easeInOutCubic(progress);
    
    // Create expanding circle effect
    const maxRadius = Math.sqrt(Math.pow(ctx.canvas.width, 2) + Math.pow(ctx.canvas.height, 2));
    const currentRadius = maxRadius * easedProgress;
    
    // Fill background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Show text with fade out
    const textOpacity = 1 - easedProgress;
    ctx.font = `300 ${Math.min(ctx.canvas.width * 0.06, 80)}px -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif`;
    ctx.fillStyle = `rgba(255, 255, 255, ${textOpacity * 0.9})`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Scale text slightly
    ctx.save();
    const scale = 1 + (easedProgress * 0.1);
    ctx.translate(ctx.canvas.width / 2, ctx.canvas.height / 2);
    ctx.scale(scale, scale);
    ctx.fillText(tagline, 0, 0);
    ctx.restore();
    
    // Create circular opening effect
    if (easedProgress > 0.3) {
      const openingProgress = (easedProgress - 0.3) / 0.7;
      const openingRadius = maxRadius * openingProgress;
      
      // Create circular clipping mask for opening effect
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(ctx.canvas.width / 2, ctx.canvas.height / 2, openingRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'white';
      ctx.fill();
      ctx.restore();
    }
  };


  const animate = (currentTime: number) => {
    if (!startTimeRef.current) {
      startTimeRef.current = currentTime;
    }
    
    const elapsedTime = currentTime - startTimeRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    
    if (!ctx || !canvas) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (elapsedTime <= timeline.typewriter_end) {
      // Typewriter effect
      const progress = Math.min(1, elapsedTime / (timeline.typewriter_end - timeline.typewriter_start));
      drawTypewriter(ctx, progress);
    } else if (elapsedTime <= timeline.pause_end) {
      // Pause phase with animated dots
      drawPause(ctx, elapsedTime - timeline.pause_start);
    } else if (elapsedTime <= timeline.opening_end) {
      // Opening effect
      const progress = Math.min(1, (elapsedTime - timeline.opening_start) / (timeline.opening_end - timeline.opening_start));
      drawOpening(ctx, progress);
    } else {
      // Animation complete
      setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, 200);
      return;
    }
    
    animationRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: 'block' }}
      />
    </div>
  );
};