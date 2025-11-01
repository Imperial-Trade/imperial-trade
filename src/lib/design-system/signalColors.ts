/**
 * Professional Dual-Mode Color System for Signal Stream Mobile.
 * Implements "Clarity in the Glass House" design philosophy for both dark and light themes.
 * - Glassmorphism for depth
 * - No glow effects
 * - High-contrast, minimalist palette
 */

export const signalColors = {
  dark: {
    // ========== BACKGROUNDS & SURFACES ==========
    bg: {
      /** Pure black background for the entire app view. */
      primary: '#000000',
      /** Solid black background - no gradient */
      gradient: '#000000',
      /** Solid black background - no gradient */
      meshGradient: '#000000',
      /** Solid dark grey for opaque elements like input fields. (Apple System Dark Grey) */
      surface: '#1C1C1E',
      /** The core of our design: a semi-transparent, blurred surface for all panels. */
      glass: 'rgba(18, 18, 20, 0.95)',
    },

    // ========== ACCENTS (Used with purpose) ==========
    accent: {
      /** Primary accent - professional blue */
      primary: '#5E9FF2',
      /** Alias for primary */
      blue: '#5E9FF2',
      /** Success and buy signals (Robinhood Green) */
      green: '#00C805',
      /** Exclusively for destructive actions (Clear, Delete). (Apple System Red) */
      danger: '#FF453A',
      /** Alias for danger red */
      red: '#FF453A',
      /** Only for premium badges */
      gold: '#FFD700',
      /** Deprecated - use primary */
      gradientGold: '#5E9FF2',
      /** Deprecated - use green */
      gradientGreen: '#00C805',
    },

    // ========== TEXT ==========
    text: {
      /** For all primary text and user-input content. Pure white for max contrast. */
      primary: '#FFFFFF',
      /** For subtitles and less important labels. */
      secondary: '#A0A0A0',
      /** For placeholder text and inactive icons. */
      tertiary: '#6B6B6B',
      /** Blue text for active states. */
      accent: '#5E9FF2',
      /** Green text for success. */
      success: '#00C805',
      /** Red text for clear/delete buttons. */
      danger: '#FF453A',
      /** Gold for premium only */
      gold: '#FFD700',
    },

    // ========== BORDERS ==========
    border: {
      /** The default, subtle border for all glass panels and inactive buttons. */
      default: 'rgba(255, 255, 255, 0.08)',
      /** Ultra-subtle separator for price rows. */
      subtle: 'rgba(255, 255, 255, 0.05)',
      /** A blue border to indicate a focused input or an active filter. */
      active: 'rgba(94, 159, 242, 0.4)',
      /** A blue border for the primary "Create Alert" button. */
      cta: 'rgba(94, 159, 242, 0.5)',
      /** Success border. */
      success: 'rgba(0, 200, 5, 0.4)',
      /** A red border for destructive action buttons. */
      danger: 'rgba(255, 69, 58, 0.4)',
    },

    // ========== STATES & SEMANTICS ==========
    state: {
      /** The background for an active filter button (blue tint). */
      active: 'rgba(94, 159, 242, 0.1)',
      /** The background for a destructive button (red tint). */
      danger: 'rgba(255, 69, 58, 0.08)',
      /** The background for the "Create Alert" button. */
      ctaGradient: 'rgba(94, 159, 242, 0.12)',
    },

    // ========== SEMANTIC COLORS ==========
    semantic: {
      /** Success backgrounds (green tint). */
      success: 'rgba(0, 200, 5, 0.08)',
      /** Danger backgrounds (red tint). */
      danger: 'rgba(255, 69, 58, 0.08)',
    },
  },

  light: {
    // ========== BACKGROUNDS & SURFACES ==========
    bg: {
      /** Pure white background for the entire app view. */
      primary: '#FFFFFF',
      /** Solid white background - no gradient */
      gradient: '#FFFFFF',
      /** Solid white background - no gradient */
      meshGradient: '#FFFFFF',
      /** Light grey for opaque elements like input fields. (Apple System Light Grey) */
      surface: '#F5F5F7',
      /** Light glassmorphism with subtle tint. */
      glass: 'rgba(255, 255, 255, 0.8)',
    },

    // ========== ACCENTS (Darker for visibility on light backgrounds) ==========
    accent: {
      /** Primary accent - darker blue for light mode */
      primary: '#2563EB',
      /** Alias for primary */
      blue: '#2563EB',
      /** Darker green for visibility. */
      green: '#00A804',
      /** Apple System Red (adjusted for light mode). */
      danger: '#FF3B30',
      /** Alias for danger red. */
      red: '#FF3B30',
      /** Gold for premium only */
      gold: '#C79C00',
      /** Deprecated - use primary */
      gradientGold: '#2563EB',
      /** Deprecated - use green */
      gradientGreen: '#00A804',
    },

    // ========== TEXT ==========
    text: {
      /** Pure black for primary text. */
      primary: '#000000',
      /** Grey for secondary text. */
      secondary: '#6B6B6B',
      /** Lighter grey for tertiary text. */
      tertiary: '#A0A0A0',
      /** Blue for active states. */
      accent: '#2563EB',
      /** Green for success. */
      success: '#00A804',
      /** Red for danger text. */
      danger: '#FF3B30',
      /** Gold for premium only */
      gold: '#C79C00',
    },

    // ========== BORDERS ==========
    border: {
      /** Subtle border for light mode. */
      default: 'rgba(0, 0, 0, 0.08)',
      /** Ultra-subtle separator for price rows. */
      subtle: 'rgba(0, 0, 0, 0.05)',
      /** Active border with blue. */
      active: 'rgba(37, 99, 235, 0.4)',
      /** CTA border. */
      cta: 'rgba(37, 99, 235, 0.5)',
      /** Success border. */
      success: 'rgba(0, 168, 4, 0.4)',
      /** Danger border. */
      danger: 'rgba(255, 59, 48, 0.4)',
    },

    // ========== STATES & SEMANTICS ==========
    state: {
      /** Active state background (blue tint). */
      active: 'rgba(37, 99, 235, 0.1)',
      /** Danger state background (red tint). */
      danger: 'rgba(255, 59, 48, 0.08)',
      /** CTA background for light mode. */
      ctaGradient: 'rgba(37, 99, 235, 0.12)',
    },

    // ========== SEMANTIC COLORS ==========
    semantic: {
      /** Success backgrounds (green tint). */
      success: 'rgba(0, 168, 4, 0.08)',
      /** Danger backgrounds (red tint). */
      danger: 'rgba(255, 59, 48, 0.08)',
    },
  },
} as const;

// Helper function to get current theme colors
export const getSignalColors = (isDark: boolean) => {
  return isDark ? signalColors.dark : signalColors.light;
};

// Type-safe color access
export type SignalColors = typeof signalColors.dark;
export type SignalColorTheme = 'dark' | 'light';
