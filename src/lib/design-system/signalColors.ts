/**
 * The Final Professional Color System for Signal Stream Mobile.
 * Implements a "Clarity in the Glass House" design philosophy.
 * - Glassmorphism for depth.
 * - No glow effects.
 * - High-contrast, minimalist palette.
 */
export const signalColors = {
  // ========== BACKGROUNDS & SURFACES ==========
  bg: {
    /** Pure black background for the entire app view. */
    primary: '#000000',
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
} as const;

// Type-safe color access
export type SignalColors = typeof signalColors;
