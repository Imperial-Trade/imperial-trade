import React, { useState, useEffect, useRef } from 'react';
import { Crown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface ImperialWelcomeAnimationProps {
  onComplete?: () => void;
}

export const ImperialWelcomeAnimation: React.FC<ImperialWelcomeAnimationProps> = ({ onComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>();
  const { user } = useAuth();
  
  const [isVisible, setIsVisible] = useState(true);

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

  const fullName = getUserFullName();
  const tagline = "the imperial experience awaits.";

  // Timeline configuration (faster pacing)
  const timeline = {
    phase1_start: 0,        // Welcome cursive starts immediately
    phase1_end: 4000,       // Welcome cursive for 4 seconds (faster)
    phase2_start: 4500,     // Name appears at 4.5 seconds
    phase2_end: 6500,       // Name stays for 2 seconds
    phase3_start: 7000,     // Tagline starts at 7 seconds
    phase3_end: 9500,       // Tagline for 2.5 seconds (faster)
    pause_end: 11000,       // Pause for 1.5 seconds (shorter)
    phase5_start: 11000,    // Logo appears
    phase5_end: 12500,      // Logo animation
    complete: 13000         // Total animation time
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
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    }
  };

  // Phase 1: Cursive "Welcome to Imperial" with reveal effect
  const drawPhase1 = (ctx: CanvasRenderingContext2D, progress: number) => {
    const easedProgress = easeOutQuart(progress);
    
    ctx.save();
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Create clipping mask for reveal effect
    const revealWidth = ctx.canvas.width * easedProgress;
    ctx.beginPath();
    ctx.rect(0, 0, revealWidth, ctx.canvas.height);
    ctx.clip();
    
    // Draw cursive text with gradient
    const gradient = ctx.createLinearGradient(0, 0, ctx.canvas.width, 0);
    gradient.addColorStop(0, '#000000');
    gradient.addColorStop(0.3, '#D4AF37');
    gradient.addColorStop(0.7, '#FFFFFF');
    gradient.addColorStop(1, '#D4AF37');
    
    ctx.fillStyle = gradient;
    ctx.font = `${Math.min(ctx.canvas.width * 0.08, 120)}px 'Great Vibes', 'Dancing Script', 'Apple Chancery', cursive`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const text = "Welcome to Imperial";
    ctx.fillText(text, ctx.canvas.width / 2, ctx.canvas.height / 2);
    
    ctx.restore();
  };

  // Phase 2: User name with Apple-style big font
  const drawPhase2 = (ctx: CanvasRenderingContext2D, progress: number) => {
    const easedProgress = easeInOutCubic(progress);
    
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    ctx.save();
    ctx.globalAlpha = easedProgress;
    
    const scale = 0.9 + (0.1 * easedProgress);
    ctx.translate(ctx.canvas.width / 2, ctx.canvas.height / 2);
    ctx.scale(scale, scale);
    
    // Apple-style system font
    ctx.font = `600 ${Math.min(ctx.canvas.width * 0.12, 150)}px -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif`;
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const nameText = `${fullName}!`;
    ctx.fillText(nameText, 0, 0);
    
    ctx.restore();
  };

  // Phase 3: Typewriter tagline
  const drawPhase3 = (ctx: CanvasRenderingContext2D, progress: number) => {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    const charsToShow = Math.floor(tagline.length * progress);
    const displayText = tagline.substring(0, charsToShow);
    
    ctx.font = `300 ${Math.min(ctx.canvas.width * 0.06, 80)}px -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
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

  // Phase 4: Pause with black screen
  const drawPhase4 = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  };

  // Phase 5: Dramatic Imperial logo with crown and enhanced effects
  const drawPhase5 = (ctx: CanvasRenderingContext2D, progress: number) => {
    const easedProgress = easeInOutQuart(progress);
    
    // Dramatic black background with subtle glow
    const gradient = ctx.createRadialGradient(
      ctx.canvas.width / 2, ctx.canvas.height / 2, 0,
      ctx.canvas.width / 2, ctx.canvas.height / 2, ctx.canvas.width * 0.8
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
    gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.95)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.8)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    ctx.save();
    ctx.globalAlpha = easedProgress;
    
    const centerX = ctx.canvas.width / 2;
    const centerY = ctx.canvas.height / 2;
    
    // Add dramatic scaling and glow effect
    const scale = 0.3 + (0.7 * easedProgress);
    const glowIntensity = easedProgress * 0.8;
    
    ctx.translate(centerX, centerY);
    ctx.scale(scale, scale);
    
    // Dramatic crown with multiple layers and glow
    const crownSize = Math.min(ctx.canvas.width * 0.2, 150);
    
    // Outer glow effect
    for (let i = 5; i >= 1; i--) {
      ctx.save();
      ctx.globalAlpha = (glowIntensity * 0.3) / i;
      ctx.fillStyle = '#FFD700';
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 20 * i;
      drawCrown(ctx, 0, -40, crownSize + (i * 8));
      ctx.restore();
    }
    
    // Main crown with gradient
    ctx.save();
    const crownGradient = ctx.createLinearGradient(0, -60, 0, 20);
    crownGradient.addColorStop(0, '#FFD700');
    crownGradient.addColorStop(0.3, '#FFA500');
    crownGradient.addColorStop(0.7, '#DAA520');
    crownGradient.addColorStop(1, '#B8860B');
    
    ctx.fillStyle = crownGradient;
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 15;
    drawCrown(ctx, 0, -40, crownSize);
    ctx.restore();
    
    // IMPERIAL text with dramatic reveal and gold wave effect
    const textProgress = Math.max(0, (progress - 0.2) / 0.8);
    if (textProgress > 0) {
      const textY = 60;
      const fontSize = Math.min(ctx.canvas.width * 0.12, 120);
      
      // Create the wave effect for gold reveal
      const waveWidth = ctx.canvas.width * 2;
      const waveOffset = -ctx.canvas.width + (waveWidth * textProgress);
      
      // Base text (gradient from dark to light)
      ctx.font = `700 ${fontSize}px 'Orbitron', system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const baseGradient = ctx.createLinearGradient(-200, 0, 200, 0);
      baseGradient.addColorStop(0, '#666666');
      baseGradient.addColorStop(1, '#CCCCCC');
      ctx.fillStyle = baseGradient;
      ctx.fillText('IMPERIAL', 0, textY);
      
      // Golden wave overlay with enhanced effects
      ctx.save();
      
      // Create wave clipping path
      ctx.beginPath();
      for (let x = -ctx.canvas.width; x <= ctx.canvas.width; x += 10) {
        const waveY = textY + Math.sin((x - waveOffset) * 0.02) * 30;
        if (x === -ctx.canvas.width) {
          ctx.moveTo(x, waveY);
        } else {
          ctx.lineTo(x, waveY);
        }
      }
      ctx.lineTo(ctx.canvas.width, ctx.canvas.height);
      ctx.lineTo(-ctx.canvas.width, ctx.canvas.height);
      ctx.closePath();
      
      // Only show the gold if the wave has reached this point
      const revealClip = ctx.createLinearGradient(waveOffset - 200, 0, waveOffset + 200, 0);
      revealClip.addColorStop(0, 'rgba(0,0,0,0)');
      revealClip.addColorStop(0.4, 'rgba(0,0,0,1)');
      revealClip.addColorStop(0.6, 'rgba(0,0,0,1)');
      revealClip.addColorStop(1, 'rgba(0,0,0,0)');
      
      ctx.clip();
      
      // Multiple golden text layers for depth
      for (let i = 3; i >= 0; i--) {
        ctx.save();
        
        if (i > 0) {
          ctx.globalAlpha = 0.6 / i;
          ctx.shadowColor = '#FFD700';
          ctx.shadowBlur = 20 + (i * 10);
          ctx.shadowOffsetX = i * 2;
          ctx.shadowOffsetY = i * 2;
        }
        
        const goldGradient = ctx.createLinearGradient(
          waveOffset - 100, 0, waveOffset + 300, 0
        );
        goldGradient.addColorStop(0, '#B8860B');
        goldGradient.addColorStop(0.2, '#DAA520');
        goldGradient.addColorStop(0.4, '#FFD700');
        goldGradient.addColorStop(0.6, '#FFEF94');
        goldGradient.addColorStop(0.8, '#FFD700');
        goldGradient.addColorStop(1, '#DAA520');
        
        ctx.fillStyle = goldGradient;
        ctx.fillText('IMPERIAL', 0, textY);
        ctx.restore();
      }
      
      ctx.restore();
    }
    
    ctx.restore();
  };
  
  // Helper function to draw crown shape (matching Lucide Crown icon style)
  const drawCrown = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    const scale = size / 100;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    
    ctx.beginPath();
    // Crown base
    ctx.moveTo(-40, 30);
    ctx.lineTo(40, 30);
    ctx.lineTo(35, 15);
    ctx.lineTo(-35, 15);
    ctx.closePath();
    
    // Crown peaks
    ctx.moveTo(-35, 15);
    ctx.lineTo(-25, -10);
    ctx.lineTo(-15, 5);
    ctx.lineTo(0, -25);
    ctx.lineTo(15, 5);
    ctx.lineTo(25, -10);
    ctx.lineTo(35, 15);
    
    // Crown jewels (circles)
    ctx.moveTo(-20, 0);
    ctx.arc(-20, 0, 3, 0, Math.PI * 2);
    ctx.moveTo(0, -15);
    ctx.arc(0, -15, 4, 0, Math.PI * 2);
    ctx.moveTo(20, 0);
    ctx.arc(20, 0, 3, 0, Math.PI * 2);
    
    ctx.fill();
    ctx.stroke();
    ctx.restore();
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
    
    if (elapsedTime <= timeline.phase1_end) {
      // Phase 1: Cursive welcome
      const progress = Math.min(1, elapsedTime / (timeline.phase1_end - timeline.phase1_start));
      drawPhase1(ctx, progress);
    } else if (elapsedTime <= timeline.phase2_end) {
      // Phase 2: User name
      const progress = Math.min(1, (elapsedTime - timeline.phase2_start) / (timeline.phase2_end - timeline.phase2_start));
      drawPhase2(ctx, progress);
    } else if (elapsedTime <= timeline.phase3_end) {
      // Phase 3: Typewriter tagline
      const progress = Math.min(1, (elapsedTime - timeline.phase3_start) / (timeline.phase3_end - timeline.phase3_start));
      drawPhase3(ctx, progress);
    } else if (elapsedTime <= timeline.pause_end) {
      // Phase 4: Pause
      drawPhase4(ctx);
    } else if (elapsedTime <= timeline.phase5_end) {
      // Phase 5: Logo reveal
      const progress = Math.min(1, (elapsedTime - timeline.phase5_start) / (timeline.phase5_end - timeline.phase5_start));
      drawPhase5(ctx, progress);
    } else {
      // Animation complete
      setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, 500);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: 'block' }}
      />
    </div>
  );
};