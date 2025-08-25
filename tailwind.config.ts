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
        // Professional Trading Colors
        trading: {
          'bg-primary': '220 13% 9%',     // Deep charcoal background
          'bg-secondary': '220 13% 12%',   // Slightly lighter panels
          'bg-tertiary': '220 13% 15%',    // Cards and elevated surfaces
          'border': '220 13% 20%',         // Border color
          'text-primary': '0 0% 98%',      // Primary white text
          'text-secondary': '0 0% 70%',    // Secondary gray text
          'text-muted': '0 0% 45%',        // Muted text
          'success': '142 76% 36%',        // Professional green
          'success-bg': '142 76% 36% / 0.1', // Green background
          'danger': '0 84% 60%',           // Professional red
          'danger-bg': '0 84% 60% / 0.1',  // Red background
          'warning': '43 96% 56%',         // Professional yellow
          'warning-bg': '43 96% 56% / 0.1', // Yellow background
          'info': '217 91% 60%',           // Professional blue
          'info-bg': '217 91% 60% / 0.1',  // Blue background
          'premium': '280 100% 70%',       // Premium purple accent
          'glass': '220 13% 15% / 0.8',    // Glass effect
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
				surface: 'hsl(var(--surface))',
				lightGreenHover: 'hsl(var(--light-green-hover))'
			},
			fontFamily: {
				'apple': ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
				'display': ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'system-ui', 'sans-serif'],
				'mono': ['SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'monospace'],
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
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
				},
				'flash-green': {
					'0%': {
						backgroundColor: 'hsl(var(--accent-green) / 0)',
						color: 'hsl(var(--accent-green))'
					},
					'50%': {
						backgroundColor: 'hsl(var(--accent-green) / 0.1)',
						color: 'hsl(var(--accent-green))'
					},
					'100%': {
						backgroundColor: 'hsl(var(--accent-green) / 0)',
						color: 'hsl(var(--accent-green))'
					}
				},
				'flash-red': {
					'0%': {
						backgroundColor: 'hsl(var(--destructive) / 0)',
						color: 'hsl(var(--destructive))'
					},
					'50%': {
						backgroundColor: 'hsl(var(--destructive) / 0.1)', 
						color: 'hsl(var(--destructive))'
					},
					'100%': {
						backgroundColor: 'hsl(var(--destructive) / 0)',
						color: 'hsl(var(--destructive))'
					}
				},
				// Professional Trading Animations
				'pulse-glow': {
					'0%, 100%': {
						boxShadow: '0 0 0 0 hsl(142 76% 36% / 0.4)',
					},
					'50%': {
						boxShadow: '0 0 0 10px hsl(142 76% 36% / 0)',
					},
				},
				'slide-up': {
					from: {
						opacity: '0',
						transform: 'translateY(20px)'
					},
					to: {
						opacity: '1',
						transform: 'translateY(0)'
					}
				},
				'slide-in-right': {
					from: {
						opacity: '0',
						transform: 'translateX(20px)'
					},
					to: {
						opacity: '1',
						transform: 'translateX(0)'
					}
				},
				'fade-in': {
					from: {
						opacity: '0'
					},
					to: {
						opacity: '1'
					}
				},
				'bounce-subtle': {
					'0%, 100%': {
						transform: 'translateY(0)',
					},
					'50%': {
						transform: 'translateY(-2px)',
					},
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'flash-green': 'flash-green 0.7s ease-in-out',
				'flash-red': 'flash-red 0.7s ease-in-out',
				'flash-green-intense': 'flash-green 0.4s ease-in-out',
				'flash-red-intense': 'flash-red 0.4s ease-in-out',
				'pulse-glow': 'pulse-glow 2s infinite',
				'slide-up': 'slide-up 0.3s ease-out',
				'slide-in-right': 'slide-in-right 0.3s ease-out',
				'fade-in': 'fade-in 0.2s ease-out',
				'bounce-subtle': 'bounce-subtle 2s ease-in-out infinite',
			},
			backdropBlur: {
				'xs': '2px',
			},
			boxShadow: {
				'trading-card': '0 4px 12px 0 hsl(220 13% 9% / 0.15)',
				'trading-glow-green': '0 0 20px hsl(142 76% 36% / 0.3)',
				'trading-glow-red': '0 0 20px hsl(0 84% 60% / 0.3)',
				'trading-elevated': '0 8px 32px hsl(220 13% 9% / 0.3)',
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
