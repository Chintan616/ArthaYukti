/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Map all design tokens — values live in src/styles/index.css as CSS custom properties
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        surface: 'var(--surface)',
        'surface-elevated': 'var(--surface-elevated)',
        muted: 'var(--muted)',
        'muted-foreground': 'var(--muted-foreground)',
        border: 'var(--border)',
        input: 'var(--input)',
        primary: 'var(--primary)',
        'primary-foreground': 'var(--primary-foreground)',
        success: 'var(--success)',
        destructive: 'var(--destructive)',
        ring: 'var(--ring)',
        'chart-1': 'var(--chart-1)',
        'chart-2': 'var(--chart-2)',
        'chart-3': 'var(--chart-3)',
        'chart-4': 'var(--chart-4)',
        'chart-5': 'var(--chart-5)',
      },
      fontFamily: {
        display: ['"Instrument Serif"', 'serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        sm: '2px',
        DEFAULT: '0.375rem',
        md: '4px',
        lg: '6px',
        xl: '10px',
        '2xl': '14px',
        full: '9999px',
      },
      transitionTimingFunction: {
        'finance': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};
