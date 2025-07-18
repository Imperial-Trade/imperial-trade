import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface CanvasWelcomeAnimationProps {
  onComplete?: () => void;
}

export const CanvasWelcomeAnimation: React.FC<CanvasWelcomeAnimationProps> = ({ onComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>();
  const { user } = useAuth();

  // Apple-style animation timeline (faster, more refined)
  const TIMELINE = {
    // Phase 1: Elegant fade-in title (0.3s - 2.5s) = 2.2 seconds
    phase1_start: 300,
    phase1_end: 2500,
    
    // Phase 2: User Name with subtle scale (2.8s - 4.2s) = 1.4 seconds  
    phase2_start: 2800,
    phase2_end: 4200,
    
    // Phase 3: Refined typewriter (4.5s - 7s) = 2.5 seconds
    phase3_start: 4500,
    phase3_end: 7000,
    
    // Phase 4: Brief pause (7s - 7.8s) = 0.8 seconds
    phase4_start: 7000,
    phase4_end: 7800,
    
    // Phase 5: Apple-style brand reveal (8s - 9.5s) = 1.5 seconds
    phase5_start: 8000,
    phase5_end: 9500,
  };

  // Get user's full name
  const getUserFullName = () => {
    if (user?.user_metadata?.first_name && user?.user_metadata?.last_name) {
      return `${user.user_metadata.first_name} ${user.user_metadata.last_name}`;
    }
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    if (user?.user_metadata?.display_name) {
      return user.user_metadata.display_name;
    }
    return user?.email?.split('@')[0] || 'Trader';
  };

  const userName = getUserFullName();
  const tagline = "Your journey to trading excellence begins now.";

  // Canvas setup and resize handler
  const setupCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to fill the container
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  };

  // Apple-style easing function
  const easeOutCubic = (t: number): number => {
    return 1 - Math.pow(1 - t, 3);
  };

  const easeInOutCubic = (t: number): number => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };

  // Drawing functions with Apple-style refinement
  const drawPhase1 = (ctx: CanvasRenderingContext2D, progress: number) => {
    // Phase 1: Elegant fade-in "Welcome" with Apple-style animation
    const canvas = ctx.canvas;
    const centerX = canvas.width / (2 * window.devicePixelRatio);
    const centerY = canvas.height / (2 * window.devicePixelRatio) - 40;

    // Clear with subtle gradient background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio);

    // Apple-style smooth fade with scale
    const easedProgress = easeOutCubic(progress);
    const opacity = easedProgress;
    const scale = 0.9 + (0.1 * easedProgress);

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.translate(centerX, centerY);
    ctx.scale(scale, scale);
    ctx.translate(-centerX, -centerY);

    // Clean, Apple-style typography - no cursive
    ctx.font = 'bold 72px "Inter", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Welcome', centerX, centerY);

    ctx.restore();
  };

  const drawPhase2 = (ctx: CanvasRenderingContext2D, progress: number) => {
    // Phase 2: Apple-style user name with refined animation
    const canvas = ctx.canvas;
    const centerX = canvas.width / (2 * window.devicePixelRatio);
    const centerY = canvas.height / (2 * window.devicePixelRatio);

    // Clean black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio);

    // Keep welcome text visible with same styling
    ctx.font = 'bold 72px "Inter", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Welcome', centerX, centerY - 40);

    // Apple-style user name animation
    const easedProgress = easeInOutCubic(progress);
    const scale = 0.95 + (0.05 * easedProgress);
    const opacity = easedProgress;

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.translate(centerX, centerY + 50);
    ctx.scale(scale, scale);
    ctx.translate(-centerX, -centerY - 50);

    ctx.font = '400 36px "Inter", sans-serif';
    ctx.fillStyle = '#D4AF37';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(userName, centerX, centerY + 50);

    ctx.restore();
  };

  const drawPhase3 = (ctx: CanvasRenderingContext2D, progress: number) => {
    // Phase 3: Apple-style refined typewriter
    const canvas = ctx.canvas;
    const centerX = canvas.width / (2 * window.devicePixelRatio);
    const centerY = canvas.height / (2 * window.devicePixelRatio);

    // Clean background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio);

    // Keep previous elements visible
    ctx.font = 'bold 72px "Inter", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Welcome', centerX, centerY - 40);

    ctx.font = '400 36px "Inter", sans-serif';
    ctx.fillStyle = '#D4AF37';
    ctx.fillText(userName, centerX, centerY + 50);

    // Refined typewriter with easing
    const easedProgress = easeOutCubic(progress);
    const charsToShow = Math.floor(tagline.length * easedProgress);
    const displayText = tagline.substring(0, charsToShow);

    ctx.font = '300 24px "Inter", sans-serif';
    ctx.fillStyle = '#AAAAAA';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(displayText, centerX, centerY + 120);

    // Subtle cursor
    if (charsToShow < tagline.length && Math.floor(Date.now() / 600) % 2) {
      const textWidth = ctx.measureText(displayText).width;
      ctx.fillStyle = '#D4AF37';
      ctx.fillRect(centerX + textWidth / 2 + 3, centerY + 110, 2, 20);
    }
  };

  const drawPhase4 = (ctx: CanvasRenderingContext2D) => {
    // Phase 4: Brief pause with all elements visible
    const canvas = ctx.canvas;
    const centerX = canvas.width / (2 * window.devicePixelRatio);
    const centerY = canvas.height / (2 * window.devicePixelRatio);

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio);

    // All text visible in final positions
    ctx.font = 'bold 72px "Inter", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Welcome', centerX, centerY - 40);

    ctx.font = '400 36px "Inter", sans-serif';
    ctx.fillStyle = '#D4AF37';
    ctx.fillText(userName, centerX, centerY + 50);

    ctx.font = '300 24px "Inter", sans-serif';
    ctx.fillStyle = '#AAAAAA';
    ctx.fillText(tagline, centerX, centerY + 120);
  };

  const drawPhase5 = (ctx: CanvasRenderingContext2D, progress: number) => {
    // Phase 5: Apple-style brand reveal
    const canvas = ctx.canvas;
    const centerX = canvas.width / (2 * window.devicePixelRatio);
    const centerY = canvas.height / (2 * window.devicePixelRatio);

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio);

    // Apple-style fade with subtle scale
    const easedProgress = easeOutCubic(progress);
    const scale = 0.98 + (0.02 * easedProgress);

    ctx.save();
    ctx.globalAlpha = easedProgress;
    ctx.translate(centerX, centerY);
    ctx.scale(scale, scale);
    ctx.translate(-centerX, -centerY);

    // Minimalist crown icon
    ctx.font = '48px "Inter", sans-serif';
    ctx.fillStyle = '#D4AF37';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('♔', centerX, centerY - 40);

    // Clean brand typography
    ctx.font = 'bold 42px "Inter", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('IMPERIAL', centerX, centerY + 20);

    ctx.font = '300 18px "Inter", sans-serif';
    ctx.fillStyle = '#D4AF37';
    ctx.letterSpacing = '3px';
    ctx.fillText('TRADING PLATFORM', centerX, centerY + 50);

    ctx.restore();
  };

  // Main animation loop
  const animate = (currentTime: number) => {
    if (!startTimeRef.current) {
      startTimeRef.current = currentTime;
    }

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const elapsedTime = currentTime - startTimeRef.current;

    // Determine current phase and progress
    if (elapsedTime >= TIMELINE.phase1_start && elapsedTime <= TIMELINE.phase1_end) {
      // Phase 1: Cursive reveal
      const phaseProgress = (elapsedTime - TIMELINE.phase1_start) / (TIMELINE.phase1_end - TIMELINE.phase1_start);
      drawPhase1(ctx, phaseProgress);
    } else if (elapsedTime >= TIMELINE.phase2_start && elapsedTime <= TIMELINE.phase2_end) {
      // Phase 2: User name greeting
      const phaseProgress = (elapsedTime - TIMELINE.phase2_start) / (TIMELINE.phase2_end - TIMELINE.phase2_start);
      drawPhase2(ctx, phaseProgress);
    } else if (elapsedTime >= TIMELINE.phase3_start && elapsedTime <= TIMELINE.phase3_end) {
      // Phase 3: Typewriter tagline
      const phaseProgress = (elapsedTime - TIMELINE.phase3_start) / (TIMELINE.phase3_end - TIMELINE.phase3_start);
      drawPhase3(ctx, phaseProgress);
    } else if (elapsedTime >= TIMELINE.phase4_start && elapsedTime <= TIMELINE.phase4_end) {
      // Phase 4: Dramatic pause
      drawPhase4(ctx);
    } else if (elapsedTime >= TIMELINE.phase5_start && elapsedTime <= TIMELINE.phase5_end) {
      // Phase 5: Final brand reveal
      const phaseProgress = (elapsedTime - TIMELINE.phase5_start) / (TIMELINE.phase5_end - TIMELINE.phase5_start);
      drawPhase5(ctx, phaseProgress);
    } else if (elapsedTime > TIMELINE.phase5_end) {
      // Animation complete
      drawPhase5(ctx, 1); // Show final frame
      onComplete?.();
      return; // Stop animation
    } else {
      // Before animation starts - black screen
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio);
    }

    animationRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    const cleanup = setupCanvas();
    
    // Start animation
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      cleanup?.();
    };
  }, [user]);

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ background: 'rgba(0, 0, 0, 0.9)' }}
      />
    </div>
  );
};
