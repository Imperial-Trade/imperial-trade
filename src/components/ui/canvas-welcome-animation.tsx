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

  // Animation timeline configuration (in milliseconds)
  const TIMELINE = {
    // Phase 1: Cursive Welcome (0.5s - 6.5s) = 6 seconds total
    phase1_start: 500,
    phase1_end: 6500,
    
    // Phase 2: User Name Greeting (appears at 7s)
    phase2_start: 7000,
    phase2_end: 9000,
    
    // Phase 3: Tagline Typewriter (10s - 14s) = 4 seconds
    phase3_start: 10000,
    phase3_end: 14000,
    
    // Phase 4: Dramatic Pause (14s - 17s) = 3 seconds
    phase4_start: 14000,
    phase4_end: 17000,
    
    // Phase 5: Final Brand Reveal (17.5s+)
    phase5_start: 17500,
    phase5_end: 20000,
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

  // Drawing functions for each phase
  const drawPhase1 = (ctx: CanvasRenderingContext2D, progress: number) => {
    // Phase 1: Cursive "Welcome" reveal effect
    const canvas = ctx.canvas;
    const centerX = canvas.width / (2 * window.devicePixelRatio);
    const centerY = canvas.height / (2 * window.devicePixelRatio) - 50;

    // Clear canvas with black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio);

    // Save context for clipping
    ctx.save();

    // Create clipping mask that grows from left to right
    const maskWidth = (canvas.width / window.devicePixelRatio) * progress;
    ctx.beginPath();
    ctx.rect(0, 0, maskWidth, canvas.height / window.devicePixelRatio);
    ctx.clip();

    // Draw cursive "Welcome" text
    ctx.font = `bold 120px "Great Vibes", cursive`;
    ctx.fillStyle = '#D4AF37'; // Imperial gold
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Welcome', centerX, centerY);

    // Restore context
    ctx.restore();
  };

  const drawPhase2 = (ctx: CanvasRenderingContext2D, progress: number) => {
    // Phase 2: User name greeting with fade and scale
    const canvas = ctx.canvas;
    const centerX = canvas.width / (2 * window.devicePixelRatio);
    const centerY = canvas.height / (2 * window.devicePixelRatio) + 80;

    // Black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio);

    // Keep cursive "Welcome" visible
    ctx.font = `bold 120px "Great Vibes", cursive`;
    ctx.fillStyle = '#D4AF37';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Welcome', centerX, centerY - 130);

    // Animate user name with fade and scale
    const scale = 0.95 + (0.05 * progress);
    const opacity = progress;

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.translate(centerX, centerY);
    ctx.scale(scale, scale);
    ctx.translate(-centerX, -centerY);

    ctx.font = 'bold 48px "Inter", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(userName, centerX, centerY);

    ctx.restore();
  };

  const drawPhase3 = (ctx: CanvasRenderingContext2D, progress: number) => {
    // Phase 3: Typewriter effect for tagline
    const canvas = ctx.canvas;
    const centerX = canvas.width / (2 * window.devicePixelRatio);
    const centerY = canvas.height / (2 * window.devicePixelRatio);

    // Black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio);

    // Keep previous elements visible
    ctx.font = `bold 120px "Great Vibes", cursive`;
    ctx.fillStyle = '#D4AF37';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Welcome', centerX, centerY - 100);

    ctx.font = 'bold 48px "Inter", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(userName, centerX, centerY);

    // Typewriter effect for tagline
    const charsToShow = Math.floor(tagline.length * progress);
    const displayText = tagline.substring(0, charsToShow);

    ctx.font = '32px "Inter", sans-serif';
    ctx.fillStyle = '#CCCCCC';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(displayText, centerX, centerY + 80);

    // Typing cursor
    if (charsToShow < tagline.length) {
      const textWidth = ctx.measureText(displayText).width;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(centerX + textWidth / 2 + 5, centerY + 60, 3, 40);
    }
  };

  const drawPhase4 = (ctx: CanvasRenderingContext2D) => {
    // Phase 4: Dramatic pause - hold everything static
    const canvas = ctx.canvas;
    const centerX = canvas.width / (2 * window.devicePixelRatio);
    const centerY = canvas.height / (2 * window.devicePixelRatio);

    // Black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio);

    // All text visible
    ctx.font = `bold 120px "Great Vibes", cursive`;
    ctx.fillStyle = '#D4AF37';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Welcome', centerX, centerY - 100);

    ctx.font = 'bold 48px "Inter", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(userName, centerX, centerY);

    ctx.font = '32px "Inter", sans-serif';
    ctx.fillStyle = '#CCCCCC';
    ctx.fillText(tagline, centerX, centerY + 80);
  };

  const drawPhase5 = (ctx: CanvasRenderingContext2D, progress: number) => {
    // Phase 5: Final brand reveal with fade in
    const canvas = ctx.canvas;
    const centerX = canvas.width / (2 * window.devicePixelRatio);
    const centerY = canvas.height / (2 * window.devicePixelRatio);

    // Black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio);

    // Fade in Imperial logo and brand name
    ctx.save();
    ctx.globalAlpha = progress;

    // Imperial logo (crown symbol)
    ctx.font = '80px "Lucide"';
    ctx.fillStyle = '#D4AF37';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('♔', centerX, centerY - 60);

    // Imperial Trading text
    ctx.font = 'bold 48px "Inter", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('IMPERIAL', centerX, centerY + 20);

    ctx.font = '24px "Inter", sans-serif';
    ctx.fillStyle = '#D4AF37';
    ctx.fillText('TRADING PLATFORM', centerX, centerY + 60);

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
    <div className="fixed inset-0 z-50 bg-black">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ background: '#000000' }}
      />
    </div>
  );
};
