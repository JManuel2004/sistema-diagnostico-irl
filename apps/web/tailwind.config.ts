import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';

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

        // Icesi institutional primary + complementary palette
        'azul-icesi': '#5454E9',
        'verde-icesi': '#4CB979',
        'amarillo-icesi': '#E4EB60',
        'morado-icesi': '#865CF0',
        'naranja-icesi': '#E9683B',
        'gris-1': '#88898C',
        'gris-2': '#CECFD4',

        // Semantic — bound to IRL imbalance classifications (RF-10)
        critical: {
          DEFAULT: '#A53221',
          bg: '#FBEDEA',
          foreground: '#FFFFFF',
        },
        moderate: {
          DEFAULT: '#8C3811',
          bg: '#FBEDE5',
          foreground: '#FFFFFF',
        },
        acceptable: {
          DEFAULT: '#1F633D',
          bg: '#E5F2EB',
          foreground: '#FFFFFF',
        },
        info: {
          DEFAULT: '#5454E9',
          bg: '#EFEFFB',
        },

        /*
         * IRL dimension hues — usados en barras de acento, dots,
         * chips y overlines. Nunca en inputs de respuesta.
         *
         * El par `{code}` / `{code}-ink` separa dos roles visuales:
         *   - `{code}`: tono brillante institucional (Azul, Morado,
         *     Verde, Naranja, Amarillo Icesi). Va en `bg-*`, dots,
         *     barras de acento. Anclado a la paleta del manual y a
         *     los mosaicos de la web de INNLAB.
         *   - `{code}-ink`: misma familia cromática pero oscurecida
         *     a ≥4.5:1 sobre blanco. Va en `text-*-ink` para
         *     overlines y etiquetas legibles sin sacrificar la
         *     identidad cromática del eje.
         *
         * IPRL no tiene contraparte directa en los 5 colores Icesi
         * brillantes; usa un indigo profundo (`#3D3D8C`) — primo
         * sobrio de Azul Icesi — que diferencia visualmente del TRL
         * y conserva la familia cromática institucional.
         */
        dimension: {
          trl: '#5454E9',
          crl: '#865CF0',
          brl: '#4CB979',
          iprl: '#3D3D8C',
          tmrl: '#E9683B',
          frl: '#E4EB60',

          'trl-ink': '#3737BD',
          'crl-ink': '#6037D1',
          'brl-ink': '#1F8550',
          'iprl-ink': '#3D3D8C',
          'tmrl-ink': '#B84F2A',
          'frl-ink': '#8C7818',
        },
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
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
        display: ['3rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
        overline: ['0.6875rem', { lineHeight: '1.3', letterSpacing: '0.08em', fontWeight: '600' }],
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
