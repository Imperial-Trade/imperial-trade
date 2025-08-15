import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))'
        },
        // Spanish Gray Monochromatic Palette
        gray: {
          'darkest': 'hsl(var(--gray-darkest))',
          'dark': 'hsl(var(--gray-dark))',
          'medium': 'hsl(var(--gray-medium))',
          'medium-light': 'hsl(var(--gray-medium-light))',
          'light': 'hsl(var(--gray-light))',
          'lighter': 'hsl(var(--gray-lighter))',
          'lightest': 'hsl(var(--gray-lightest))'
        },
        // Gold Palette - Luxury warmth
        gold: {
          'bright': 'hsl(var(--gold-bright))',
          'warm': 'hsl(var(--gold-warm))',
          'antique': 'hsl(var(--gold-antique))',
          'muted': 'hsl(var(--gold-muted))',
          'light': 'hsl(var(--gold-light))'
        },
        // Orache Palette - Warm earthy orange
        orache: {
          'bright': 'hsl(var(--orache-bright))',
          'warm': 'hsl(var(--orache-warm))',
          'rust': 'hsl(var(--orache-rust))',
          'dusty': 'hsl(var(--orache-dusty))',
          'light': 'hsl(var(--orache-light))'
        },
        // Imperial White Gold & Bronze Gradient Colors
        imperial: {
          'white': 'hsl(var(--imperial-white))',
          'platinum': 'hsl(var(--imperial-platinum))',
          'gold-light': 'hsl(var(--imperial-gold-light))',
          'gold': 'hsl(var(--imperial-gold))',
          'bronze-light': 'hsl(var(--imperial-bronze-light))',
          'bronze': 'hsl(var(--imperial-bronze))',
          'bronze-dark': 'hsl(var(--imperial-bronze-dark))'
        },
        // Elegant Background Gradient Colors
        bgGradient: {
          'white': 'hsl(var(--bg-gradient-white))',
          'light': 'hsl(var(--bg-gradient-light))',
          'medium': 'hsl(var(--bg-gradient-medium))',
          'dark': 'hsl(var(--bg-gradient-dark))',
          'black': 'hsl(var(--bg-gradient-black))'
        },
        // Subtle Green Accent Colors
        accentGreen: {
          'sage': 'hsl(var(--accent-sage))',
          'mint': 'hsl(var(--accent-mint))',
          'forest': 'hsl(var(--accent-forest))',
          'light': 'hsl(141, 76%, 48%)',
          'DEFAULT': 'hsl(141, 79%, 35%)',
          'dark': 'hsl(141, 79%, 27%)',
        },
        // Feature colors (for product features only)
        feature: {
          'blue': 'hsl(var(--feature-blue))',
          'green': 'hsl(var(--feature-green))',
          'orange': 'hsl(var(--feature-orange))',
          'purple': 'hsl(var(--feature-purple))',
          'pink': 'hsl(var(--feature-pink))',
          'red': 'hsl(var(--feature-red))',
          'light': 'hsl(217, 91%, 65%)',
          'DEFAULT': 'hsl(217, 91%, 60%)',
          'dark': 'hsl(217, 91%, 55%)',
        },
        // Trading platform accent colors  
        accent: {
          'green': 'hsl(var(--accent-green))',
          'blue': 'hsl(var(--accent-blue))',
          'gold': 'hsl(var(--accent-gold))',
          'red': 'hsl(var(--accent-red))'
        },
				// Surface colors for components
				surface: 'hsl(var(--surface))',
				// Light mode specific colors
				lightGreenHover: 'hsl(var(--light-green-hover))'
			},
			fontFamily: {
				'apple': ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
				'display': ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'system-ui', 'sans-serif'],
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			screens: {
				'xs': '475px',
				'touch': { 'raw': '(hover: none) and (pointer: coarse)' },
				'no-touch': { 'raw': '(hover: hover) and (pointer: fine)' }
			},
			spacing: {
				'safe-top': 'var(--safe-area-top)',
				'safe-bottom': 'var(--safe-area-bottom)',
				'safe-left': 'var(--safe-area-left)',
				'safe-right': 'var(--safe-area-right)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'slide-up-mobile': 'slideUpMobile 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
				'slide-down-mobile': 'slideDownMobile 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
				'bounce-in': 'bounceIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
				'shimmer': 'shimmer 1.5s infinite'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
