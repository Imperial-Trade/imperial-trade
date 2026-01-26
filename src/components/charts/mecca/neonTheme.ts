// MECCA XX Premium Trading Theme
// Professional dark theme with emerald/gold accents matching JournalXX

export const neonColors = {
  // Core backgrounds - Matching JournalXX dark mode
  bgPrimary: '#0A0A0A',
  bgSecondary: '#0d0d0d',
  bgCard: 'rgba(10, 10, 10, 0.95)',
  bgCardHover: 'rgba(20, 20, 20, 0.95)',
  bgGlass: 'rgba(255, 255, 255, 0.03)',
  
  // Premium accents - Emerald/Gold (matching JournalXX)
  emerald: '#22c55e',
  emeraldLight: '#4ade80',
  emeraldDark: '#16a34a',
  emeraldGlow: 'rgba(34, 197, 94, 0.4)',
  emeraldSubtle: 'rgba(34, 197, 94, 0.1)',
  
  gold: '#eab308',
  goldLight: '#facc15',
  goldDark: '#ca8a04',
  goldGlow: 'rgba(234, 179, 8, 0.4)',
  goldSubtle: 'rgba(234, 179, 8, 0.1)',
  
  // Legacy aliases for compatibility
  neonGreen: '#22c55e',
  neonGreenLight: '#4ade80',
  neonGreenDark: '#16a34a',
  neonGreenGlow: 'rgba(34, 197, 94, 0.4)',
  neonGreenSubtle: 'rgba(34, 197, 94, 0.1)',
  
  neonCyan: '#06b6d4',
  neonCyanGlow: 'rgba(6, 182, 212, 0.4)',
  
  neonPurple: '#a855f7',
  neonPurpleGlow: 'rgba(168, 85, 247, 0.4)',
  
  // Semantic colors
  positive: '#22c55e',
  positiveGlow: 'rgba(34, 197, 94, 0.3)',
  positiveBg: 'rgba(34, 197, 94, 0.1)',
  negative: '#ef4444',
  negativeGlow: 'rgba(239, 68, 68, 0.3)',
  negativeBg: 'rgba(239, 68, 68, 0.1)',
  neutral: '#f59e0b',
  neutralGlow: 'rgba(245, 158, 11, 0.3)',
  
  // Text colors - Warmer tones matching JournalXX
  textPrimary: '#ffffff',
  textSecondary: '#d4d4d4',
  textMuted: 'rgba(163, 163, 163, 0.7)',
  textDim: 'rgba(163, 163, 163, 0.4)',
  
  // Border colors - Emerald accent
  borderDefault: 'rgba(255, 255, 255, 0.08)',
  borderHover: 'rgba(34, 197, 94, 0.3)',
  borderActive: 'rgba(34, 197, 94, 0.5)',
  borderEmerald: 'rgba(34, 197, 94, 0.2)',
} as const;

// Premium gradient definitions
export const premiumGradients = {
  // JournalXX-style active button gradient
  activeButton: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(234, 179, 8, 0.1) 100%)',
  activeButtonBorder: 'rgba(34, 197, 94, 0.3)',
  
  // Premium card gradient
  premiumCard: 'linear-gradient(135deg, rgba(34, 197, 94, 0.05) 0%, rgba(234, 179, 8, 0.02) 100%)',
  
  // Success state gradient border
  successBorder: 'linear-gradient(90deg, #eab308, #22c55e, #eab308)',
  
  // Text gradient for "XX" branding
  xxText: 'linear-gradient(135deg, #4ade80, #facc15, #4ade80)',
  
  // Aurora glow effect
  auroraGlow: 'conic-gradient(from 0deg, rgba(34, 197, 94, 0.3), rgba(234, 179, 8, 0.2), rgba(34, 197, 94, 0.1), transparent, rgba(34, 197, 94, 0.3))',
  
  // Glass effect
  glass: 'rgba(255, 255, 255, 0.03)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
  glassHover: 'rgba(255, 255, 255, 0.05)',
} as const;

// Glassmorphism styles matching JournalXX
export const glassStyle = {
  background: 'rgba(255, 255, 255, 0.03)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
} as const;

export const neonCardStyle = {
  background: `linear-gradient(135deg, ${neonColors.bgCard} 0%, rgba(10, 10, 18, 0.9) 100%)`,
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: `1px solid ${neonColors.borderDefault}`,
  borderRadius: '16px',
  boxShadow: `0 4px 24px rgba(0, 0, 0, 0.4), 0 0 40px ${neonColors.neonGreenSubtle}, inset 0 1px 0 rgba(99, 102, 241, 0.1)`,
};

export const neonCardHoverStyle = {
  ...neonCardStyle,
  border: `1px solid ${neonColors.borderHover}`,
  boxShadow: `0 4px 24px rgba(0, 0, 0, 0.5), 0 0 60px ${neonColors.neonGreenGlow}, inset 0 1px 0 rgba(99, 102, 241, 0.15)`,
};

export const neonCardActiveStyle = {
  ...neonCardStyle,
  border: `1px solid ${neonColors.borderActive}`,
  boxShadow: `0 4px 24px rgba(0, 0, 0, 0.5), 0 0 80px ${neonColors.neonGreenGlow}, inset 0 1px 0 rgba(99, 102, 241, 0.2)`,
};

export const neonButtonStyle = {
  background: `linear-gradient(135deg, ${neonColors.neonGreen} 0%, ${neonColors.neonGreenDark} 100%)`,
  border: 'none',
  borderRadius: '12px',
  color: '#000',
  fontWeight: 600,
  boxShadow: `0 0 20px ${neonColors.neonGreenGlow}`,
  transition: 'all 0.2s ease',
};

export const neonButtonHoverStyle = {
  ...neonButtonStyle,
  boxShadow: `0 0 30px ${neonColors.neonGreenGlow}, 0 0 60px ${neonColors.neonGreenSubtle}`,
  transform: 'translateY(-1px)',
};

export const neonTextGlow = {
  textShadow: `0 0 10px ${neonColors.neonGreenGlow}, 0 0 20px ${neonColors.neonGreenSubtle}`,
};

export const neonBorderGlow = {
  boxShadow: `0 0 15px ${neonColors.neonGreenGlow}`,
};

// Utility function for price change colors
export const getPriceChangeColor = (change: number) => ({
  color: change >= 0 ? neonColors.positive : neonColors.negative,
  glow: change >= 0 ? neonColors.positiveGlow : neonColors.negativeGlow,
});

// Session colors
export const sessionColors = {
  sydney: { bg: '#3b82f6', glow: 'rgba(59, 130, 246, 0.4)' },
  tokyo: { bg: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)' },
  london: { bg: '#22c55e', glow: 'rgba(34, 197, 94, 0.4)' },
  newYork: { bg: '#ef4444', glow: 'rgba(239, 68, 68, 0.4)' },
};

// Asset icons mapping
export const assetIcons: Record<string, string> = {
  XAUUSD: '🥇',
  BTCUSD: '₿',
  U30USD: '📊',
  SPXUSD: '📈',
  NDXUSD: '💻',
  EURUSD: '€',
  GBPUSD: '£',
  USDJPY: '¥',
};

// Animation keyframes as CSS string (for injection)
export const neonAnimations = `
  @keyframes neonPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }
  
  @keyframes emeraldGlow {
    0%, 100% { box-shadow: 0 0 5px rgba(34, 197, 94, 0.4), 0 0 10px rgba(34, 197, 94, 0.2); }
    50% { box-shadow: 0 0 15px rgba(34, 197, 94, 0.6), 0 0 30px rgba(34, 197, 94, 0.3); }
  }
  
  @keyframes goldGlow {
    0%, 100% { box-shadow: 0 0 5px rgba(234, 179, 8, 0.4), 0 0 10px rgba(234, 179, 8, 0.2); }
    50% { box-shadow: 0 0 15px rgba(234, 179, 8, 0.6), 0 0 30px rgba(234, 179, 8, 0.3); }
  }
  
  @keyframes scanline {
    0% { transform: translateY(-100%); }
    100% { transform: translateY(100%); }
  }
  
  @keyframes tickerScroll {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  
  @keyframes priceFlashUp {
    0% { background-color: transparent; }
    50% { background-color: rgba(34, 197, 94, 0.2); }
    100% { background-color: transparent; }
  }
  
  @keyframes priceFlashDown {
    0% { background-color: transparent; }
    50% { background-color: rgba(239, 68, 68, 0.2); }
    100% { background-color: transparent; }
  }
  
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  
  @keyframes aurora {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  @keyframes particle-burst {
    0% { 
      transform: translate(0, 0) scale(1);
      opacity: 1;
    }
    100% { 
      transform: translate(calc(cos(var(--particle-angle)) * 60px), calc(sin(var(--particle-angle)) * 60px)) scale(0);
      opacity: 0;
    }
  }
  
  @keyframes typing-cursor {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }
  
  @keyframes slide-up {
    0% { transform: translateY(100%); opacity: 0; }
    100% { transform: translateY(0); opacity: 1; }
  }
  
  @keyframes scale-in {
    0% { transform: scale(0.9); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
  }
  
  @keyframes pulse-ring {
    0% { transform: scale(0.8); opacity: 1; }
    100% { transform: scale(1.4); opacity: 0; }
  }
  
  @keyframes number-tick {
    0% { transform: translateY(0); }
    50% { transform: translateY(-2px); }
    100% { transform: translateY(0); }
  }
`;

// Premium button styles matching JournalXX
export const premiumButtonStyles = {
  primary: {
    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    color: '#000',
    border: 'none',
    boxShadow: '0 0 20px rgba(34, 197, 94, 0.4)',
  },
  primaryHover: {
    boxShadow: '0 0 30px rgba(34, 197, 94, 0.6), 0 0 60px rgba(34, 197, 94, 0.2)',
    transform: 'translateY(-1px)',
  },
  secondary: {
    background: 'transparent',
    color: neonColors.textSecondary,
    border: `1px solid ${neonColors.borderDefault}`,
  },
  secondaryHover: {
    background: 'rgba(255, 255, 255, 0.05)',
    borderColor: neonColors.borderHover,
  },
  active: {
    background: premiumGradients.activeButton,
    color: '#22c55e',
    border: `1px solid ${premiumGradients.activeButtonBorder}`,
    boxShadow: '0 0 15px rgba(34, 197, 94, 0.15)',
  },
} as const;
