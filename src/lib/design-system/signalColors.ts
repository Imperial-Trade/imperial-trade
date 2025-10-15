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
      /** Dynamic gradient background for glassmorphism */
      gradient: 'radial-gradient(circle at 20% 50%, rgba(255, 215, 0, 0.08) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(0, 200, 5, 0.06) 0%, transparent 50%), radial-gradient(circle at 40% 80%, rgba(94, 159, 242, 0.05) 0%, transparent 50%), #000000',
      /** Animated mesh gradient overlay */
      meshGradient: 'radial-gradient(at 0% 0%, rgba(255, 215, 0, 0.1) 0px, transparent 50%), radial-gradient(at 50% 50%, rgba(0, 200, 5, 0.08) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(94, 159, 242, 0.06) 0px, transparent 50%), #000000',
      /** Solid dark grey for opaque elements like input fields. (Apple System Dark Grey) */
      surface: '#1C1C1E',
      /** The core of our design: a semi-transparent, blurred surface for all panels. */
      glass: 'rgba(28, 28, 30, 0.7)',
    },

    // ========== ACCENTS (Used with purpose) ==========
    accent: {
      /** For primary CTAs, active filters, and important highlights. */
      gold: '#FFD700',
      /** The gradient start/end for the "Xeon alerts" text. */
      gradientGold: '#FFD700',
      /** The gradient middle for the "Xeon alerts" text. (Robinhood Green) */
      gradientGreen: '#00C805',
      /** Success and buy signals (Robinhood Green) */
      green: '#00C805',
      /** Exclusively for destructive actions (Clear, Delete). (Apple System Red) */
      danger: '#FF453A',
      /** Alias for danger red */
      red: '#FF453A',
    },

    // ========== TEXT ==========
    text: {
      /** For all primary text and user-input content. Pure white for max contrast. */
      primary: '#FFFFFF',
      /** For subtitles and less important labels. (Apple System Light Grey) */
      secondary: '#EBEBF5',
      /** For placeholder text and inactive icons. (Apple System Muted Grey) */
      tertiary: '#8E8E93',
      /** Gold text for active states. */
      gold: '#FFD700',
      /** Red text for clear/delete buttons. */
      danger: '#FF453A',
    },

    // ========== BORDERS ==========
    border: {
      /** The default, subtle border for all glass panels and inactive buttons. */
      default: 'rgba(255, 255, 255, 0.1)',
      /** Ultra-subtle separator for price rows. */
      subtle: 'rgba(255, 255, 255, 0.05)',
      /** A strong gold border to indicate a focused input or an active filter. */
      active: 'rgba(255, 215, 0, 0.5)',
      /** A stronger gold border for the primary "Create Alert" button. */
      cta: 'rgba(255, 215, 0, 0.6)',
      /** A red border for destructive action buttons. */
      danger: 'rgba(255, 69, 58, 0.3)',
    },

    // ========== STATES & SEMANTICS ==========
    state: {
      /** The background for an active filter button (gold tint). */
      active: 'rgba(255, 215, 0, 0.12)',
      /** The background for a destructive button (red tint). */
      danger: 'rgba(255, 69, 58, 0.12)',
      /** The background gradient for the "Create Alert" button. */
      ctaGradient: 'linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 215, 0, 0.08) 100%)',
    },

    // ========== SEMANTIC COLORS ==========
    semantic: {
      /** Success backgrounds (green tint). */
      success: 'rgba(0, 200, 5, 0.12)',
      /** Danger backgrounds (red tint). */
      danger: 'rgba(255, 69, 58, 0.12)',
    },
  },

  light: {
    // ========== BACKGROUNDS & SURFACES ==========
    bg: {
      /** Pure white background for the entire app view. */
      primary: '#FFFFFF',
      /** Dynamic gradient background for glassmorphism */
      gradient: 'radial-gradient(circle at 20% 50%, rgba(199, 156, 0, 0.06) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(0, 168, 4, 0.04) 0%, transparent 50%), radial-gradient(circle at 40% 80%, rgba(94, 159, 242, 0.03) 0%, transparent 50%), #FFFFFF',
      /** Animated mesh gradient overlay */
      meshGradient: 'radial-gradient(at 0% 0%, rgba(199, 156, 0, 0.08) 0px, transparent 50%), radial-gradient(at 50% 50%, rgba(0, 168, 4, 0.06) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(94, 159, 242, 0.04) 0px, transparent 50%), #FFFFFF',
      /** Light grey for opaque elements like input fields. (Apple System Light Grey) */
      surface: '#F5F5F7',
      /** Light glassmorphism with subtle tint. */
      glass: 'rgba(245, 245, 247, 0.7)',
    },

    // ========== ACCENTS (Darker for visibility on light backgrounds) ==========
    accent: {
      /** Darker gold for light mode visibility. */
      gold: '#C79C00',
      /** Gradient gold for light mode. */
      gradientGold: '#C79C00',
      /** Gradient green for light mode. */
      gradientGreen: '#00A804',
      /** Darker green for visibility. */
      green: '#00A804',
      /** Apple System Red (adjusted for light mode). */
      danger: '#FF3B30',
      /** Alias for danger red. */
      red: '#FF3B30',
    },

    // ========== TEXT ==========
    text: {
      /** Pure black for primary text. */
      primary: '#000000',
      /** Apple System Dark Grey for secondary text. */
      secondary: '#3C3C43',
      /** Neutral grey for tertiary text. */
      tertiary: '#8E8E93',
      /** Darker gold for active states. */
      gold: '#C79C00',
      /** Red for danger text. */
      danger: '#FF3B30',
    },

    // ========== BORDERS ==========
    border: {
      /** Subtle border for light mode. */
      default: 'rgba(0, 0, 0, 0.1)',
      /** Ultra-subtle separator for price rows. */
      subtle: 'rgba(0, 0, 0, 0.05)',
      /** Active border with darker gold. */
      active: 'rgba(199, 156, 0, 0.5)',
      /** CTA border. */
      cta: 'rgba(199, 156, 0, 0.6)',
      /** Danger border. */
      danger: 'rgba(255, 59, 48, 0.3)',
    },

    // ========== STATES & SEMANTICS ==========
    state: {
      /** Active state background (gold tint). */
      active: 'rgba(199, 156, 0, 0.12)',
      /** Danger state background (red tint). */
      danger: 'rgba(255, 59, 48, 0.12)',
      /** CTA gradient for light mode. */
      ctaGradient: 'linear-gradient(135deg, rgba(199, 156, 0, 0.15) 0%, rgba(199, 156, 0, 0.08) 100%)',
    },

    // ========== SEMANTIC COLORS ==========
    semantic: {
      /** Success backgrounds (green tint). */
      success: 'rgba(0, 168, 4, 0.12)',
      /** Danger backgrounds (red tint). */
      danger: 'rgba(255, 59, 48, 0.12)',
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
