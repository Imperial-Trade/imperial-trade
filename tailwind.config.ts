
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
				// Modern Background Gradient Colors
				bgGradient: {
					'white': 'hsl(var(--bg-gradient-white))',
					'light': 'hsl(var(--bg-gradient-light))',
					'medium': 'hsl(var(--bg-gradient-medium))',
					'dark': 'hsl(var(--bg-gradient-dark))',
					'black': 'hsl(var(--bg-gradient-black))'
				},
				// Feature colors (for product features only)
				feature: {
					'blue': 'hsl(var(--feature-blue))',
					'green': 'hsl(var(--feature-green))',
					'orange': 'hsl(var(--feature-orange))',
					'purple': 'hsl(var(--feature-purple))',
					'pink': 'hsl(var(--feature-pink))',
					'red': 'hsl(var(--feature-red))'
				},
				// Modern accent colors  
				accent: {
					'green': 'hsl(var(--accent-green))',
					'green-hover': 'hsl(var(--accent-green-hover))',
					'green-light': 'hsl(var(--accent-green-light))',
					'green-dark': 'hsl(var(--accent-green-dark))',
					'blue': 'hsl(var(--accent-blue))',
					'blue-hover': 'hsl(var(--accent-blue-hover))',
					'red': 'hsl(var(--accent-red))',
					'orange': 'hsl(var(--accent-orange))'
				},
				// Surface colors for components
				surface: 'hsl(var(--surface))',
				// Light mode specific colors
				lightGreenHover: 'hsl(var(--light-green-hover))'
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
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
