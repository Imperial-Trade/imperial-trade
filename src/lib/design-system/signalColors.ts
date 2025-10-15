/**
 * Signal Stream Mobile Color System
 * Inspired by Robinhood, Apple, and Twitter design systems
 * 
 * Design Philosophy:
 * - Pure black backgrounds (Twitter/Apple style)
 * - Minimal color palette (5 core colors)
 * - High contrast for accessibility
 * - Glassmorphism with subtle depth
 */

export const signalColors = {
  // ========== BACKGROUNDS ==========
  // Pure black base (Twitter style)
  bg: {
    primary: '#000000',           // Main background
    secondary: '#1C1C1E',         // Card/surface background (Apple system)
    tertiary: '#2C2C2E',          // Elevated surface (Apple system)
    glass: 'rgba(28, 28, 30, 0.7)', // Glassmorphism overlay
  },

  // ========== ACCENT COLORS ==========
  accent: {
    gold: '#FFD700',              // Premium features, active states (Imperial brand)
    green: '#00C805',             // Success, buy signals (Robinhood)
    red: '#FF453A',               // Danger, sell signals (Apple system red)
    blue: '#0A84FF',              // Info, links (Apple system blue)
  },

  // ========== TEXT COLORS ==========
  text: {
    primary: '#FFFFFF',           // Headings, main content
    secondary: '#EBEBF5',         // Body text (Apple secondary)
    tertiary: '#8E8E93',          // Muted text, placeholders (Apple tertiary)
    gold: '#FFD700',              // Emphasized text (active states)
  },

  // ========== BORDERS ==========
  border: {
    default: 'rgba(255, 255, 255, 0.1)',   // Standard borders
    active: 'rgba(255, 215, 0, 0.5)',      // Active/focused borders (gold)
    hover: 'rgba(255, 255, 255, 0.2)',     // Hover state borders
  },

  // ========== INTERACTIVE STATES ==========
  state: {
    inactive: 'rgba(255, 255, 255, 0.05)',  // Inactive buttons
    active: 'rgba(255, 215, 0, 0.12)',      // Active buttons (gold tint)
    hover: 'rgba(255, 255, 255, 0.08)',     // Hover overlay
    pressed: 'rgba(255, 255, 255, 0.03)',   // Active press state
  },

  // ========== SEMANTIC COLORS ==========
  semantic: {
    success: 'rgba(0, 200, 5, 0.12)',       // Success backgrounds
    danger: 'rgba(255, 69, 58, 0.12)',      // Danger backgrounds
    info: 'rgba(10, 132, 255, 0.12)',       // Info backgrounds
  },
} as const;

// Type-safe color access
export type SignalColors = typeof signalColors;
