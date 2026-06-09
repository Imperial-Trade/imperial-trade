/**
 * Pattern Stream Rooms - Design Tokens (TS export)
 * Mirrors src/styles/pattern-stream-tokens.css for use in JS animations,
 * inline styles, and Framer Motion configs.
 */

export const psTokens = {
  color: {
    canvas: '#070707',
    surface: '#0e0e0e',
    surfaceElev: '#161616',
    surfacePopover: '#1c1c1c',
    text: '#ffffff',
    textSecondary: '#c9c9c9',
    textTertiary: '#8a8a8a',
    textDisabled: '#5a5a5a',
    green: '#22c55e',
    greenHover: '#34d27a',
    greenActive: '#16a34a',
    yellowGreen: '#a4e635',
    negative: '#ff5c7a',
    warning: '#ffb547',
  },
  glass: {
    bg: 'rgba(255, 255, 255, 0.05)',
    bgElev: 'rgba(255, 255, 255, 0.07)',
    bgActive: 'rgba(255, 255, 255, 0.10)',
    blur: '24px',
    saturate: 1.4,
  },
  radius: {
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    pill: 9999,
  },
  spacing: {
    px: 1,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    7: 28,
    8: 32,
    10: 40,
    12: 48,
    14: 56,
    16: 64,
  },
  font: {
    family: "'Geist', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    mono: "'Geist Mono', 'Geist', ui-monospace, monospace",
    sizes: {
      caption: 12,
      bodySm: 13,
      body: 15,
      h3: 18,
      h2: 20,
      h1: 24,
      display: 32,
    },
    lineHeights: {
      caption: 16,
      bodySm: 20,
      body: 22,
      h3: 24,
      h2: 28,
      h1: 32,
      display: 40,
    },
  },
  zIndex: {
    shell: 100,
    header: 200,
    composer: 300,
    bottomNav: 400,
    sheet: 500,
    modal: 600,
    toast: 700,
    banner: 800,
  },
  motion: {
    easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
    durations: {
      micro: 120,
      standard: 180,
      medium: 240,
      sheet: 320,
      page: 480,
    },
    springs: {
      snappy: { type: 'spring', stiffness: 400, damping: 32 },
      soft: { type: 'spring', stiffness: 260, damping: 26 },
      gentle: { type: 'spring', stiffness: 180, damping: 22 },
    },
  },
} as const;

export type PsTokens = typeof psTokens;

/**
 * Helper to read a CSS variable from any element under [data-ps-root].
 */
export function readPsVar(name: string, el: Element | null = document.documentElement): string {
  if (!el) return '';
  return getComputedStyle(el).getPropertyValue(name).trim();
}
