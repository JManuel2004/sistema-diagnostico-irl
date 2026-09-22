import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';
import { PALETTE } from './src/shared/lib/palette';

/**
 * Tailwind v3 configuration wired to the Icesi institutional brand
 * (Manual de identidad de marca Icesi, Febrero 2026) and to the
 * IRL Diagnostic DESIGN.md.
 *
 * Theme tokens map to CSS custom properties declared in
 * `src/styles/globals.css`. Brand-specific palette tokens
 * (`azul-icesi`, dimension hues, semantic states) are exposed as
 * Tailwind utilities so consuming code never literal-hex anything.
 */
const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        'border-strong': 'hsl(var(--border-strong))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          hover: 'hsl(var(--primary-hover))',
          pressed: 'hsl(var(--primary-pressed))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          hover: 'hsl(var(--accent-hover))',
          pressed: 'hsl(var(--accent-pressed))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        surface: {
          DEFAULT: 'hsl(var(--surface))',
          muted: 'hsl(var(--surface-muted))',
          emphasis: 'hsl(var(--surface-emphasis))',
        },

        // Icesi institutional palette, semantic and dimension colors: one
        // source in `src/shared/lib/palette.ts`, shared with the SVG code.
        'azul-icesi': PALETTE['azul-icesi'],
        'verde-icesi': PALETTE['verde-icesi'],
        'amarillo-icesi': PALETTE['amarillo-icesi'],
        'morado-icesi': PALETTE['morado-icesi'],
        'naranja-icesi': PALETTE['naranja-icesi'],
        'gris-1': PALETTE['gris-1'],
        'gris-2': PALETTE['gris-2'],

        critical: PALETTE.critical,
        moderate: PALETTE.moderate,
        acceptable: PALETTE.acceptable,
        info: PALETTE.info,

        dimension: PALETTE.dimension,
      },
      // Esquinas rectas en todo, como innlab.org. `rounded-full` sigue
      // disponible para círculos (escala Likert, pasos, puntos).
      borderRadius: {
        none: '0',
        DEFAULT: '0',
        sm: '0',
        md: '0',
        control: '0',
        lg: '0',
        xl: '0',
        '2xl': '0',
        '3xl': '0',
      },
      fontFamily: {
        sans: [
          '"Plus Jakarta Sans"',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        display: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'Arial', 'sans-serif'],
      },
      fontSize: {
        // Custom display sizes per DESIGN.md typography scale.
        display: ['3.5rem', { lineHeight: '1.05', letterSpacing: '-0.03em', fontWeight: '800' }],
        // One heading scale (h1 40 / h2 28 / h3 20), named so no page writes
        // the pixel value by hand.
        h1: ['2.5rem', { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '700' }],
        h2: ['1.75rem', { lineHeight: '1.25', letterSpacing: '-0.015em', fontWeight: '700' }],
        h3: ['1.25rem', { lineHeight: '1.35', fontWeight: '600' }],
        overline: ['0.75rem', { lineHeight: '1.3', letterSpacing: '0.06em', fontWeight: '700' }],
      },
      letterSpacing: {
        tightest: '-0.02em',
        tighter: '-0.015em',
        tight: '-0.01em',
        wider: '0.08em',
      },
      boxShadow: {
        // Icesi brand favors borders over shadows; these are restrained.
        sm: '0 1px 2px 0 rgba(26, 26, 36, 0.04)',
        md: '0 2px 6px -1px rgba(26, 26, 36, 0.06), 0 1px 3px -1px rgba(26, 26, 36, 0.04)',
        lg: '0 8px 24px -4px rgba(26, 26, 36, 0.08), 0 4px 8px -2px rgba(26, 26, 36, 0.04)',
        xl: '0 16px 40px -8px rgba(26, 26, 36, 0.10), 0 8px 16px -4px rgba(26, 26, 36, 0.06)',
        'focus-ring': '0 0 0 4px rgba(84, 84, 233, 0.30)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        shimmer: 'shimmer 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
