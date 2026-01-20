// MECCA XX Neon Trading Theme
// Professional dark theme with neon green accents inspired by Zeex Trading Dashboard

export const neonColors = {
  // Core backgrounds
  bgPrimary: '#080c0a',
  bgSecondary: '#0d1210',
  bgCard: 'rgba(13, 18, 16, 0.95)',
  bgCardHover: 'rgba(20, 28, 24, 0.95)',
  
  // Neon accents
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
  negative: '#ef4444',
  negativeGlow: 'rgba(239, 68, 68, 0.3)',
  neutral: '#f59e0b',
  neutralGlow: 'rgba(245, 158, 11, 0.3)',
  
  // Text colors
  textPrimary: '#f0fdf4',
  textSecondary: '#86efac',
  textMuted: '#4ade8066',
  textDim: 'rgba(134, 239, 172, 0.4)',
  
  // Border colors
  borderDefault: 'rgba(34, 197, 94, 0.15)',
  borderHover: 'rgba(34, 197, 94, 0.3)',
  borderActive: 'rgba(34, 197, 94, 0.5)',
} as const;

export const neonCardStyle = {
  background: `linear-gradient(135deg, ${neonColors.bgCard} 0%, rgba(8, 12, 10, 0.9) 100%)`,
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: `1px solid ${neonColors.borderDefault}`,
  borderRadius: '16px',
  boxShadow: `0 4px 24px rgba(0, 0, 0, 0.4), 0 0 40px ${neonColors.neonGreenSubtle}, inset 0 1px 0 rgba(34, 197, 94, 0.1)`,
};

export const neonCardHoverStyle = {
  ...neonCardStyle,
  border: `1px solid ${neonColors.borderHover}`,
  boxShadow: `0 4px 24px rgba(0, 0, 0, 0.5), 0 0 60px ${neonColors.neonGreenGlow}, inset 0 1px 0 rgba(34, 197, 94, 0.15)`,
};

export const neonCardActiveStyle = {
  ...neonCardStyle,
  border: `1px solid ${neonColors.borderActive}`,
  boxShadow: `0 4px 24px rgba(0, 0, 0, 0.5), 0 0 80px ${neonColors.neonGreenGlow}, inset 0 1px 0 rgba(34, 197, 94, 0.2)`,
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
  
  @keyframes neonGlow {
    0%, 100% { box-shadow: 0 0 5px rgba(34, 197, 94, 0.4), 0 0 10px rgba(34, 197, 94, 0.2); }
    50% { box-shadow: 0 0 10px rgba(34, 197, 94, 0.6), 0 0 20px rgba(34, 197, 94, 0.3); }
  }
  
  @keyframes scanline {
    0% { transform: translateY(-100%); }
    100% { transform: translateY(100%); }
  }
  
  @keyframes tickerScroll {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  
  @keyframes priceFlash {
    0% { background-color: transparent; }
    50% { background-color: rgba(34, 197, 94, 0.2); }
    100% { background-color: transparent; }
  }
`;
