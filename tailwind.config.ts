import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
        mono: ['var(--font-mono)'],
      },
      colors: {
        surface: {
          ground: 'var(--surface-ground)',
          primary: 'var(--surface-primary)',
          elevated: 'var(--surface-elevated)',
          sunken: 'var(--surface-sunken)',
        },
        ink: {
          primary: 'var(--ink-primary)',
          secondary: 'var(--ink-secondary)',
          tertiary: 'var(--ink-tertiary)',
          inverse: 'var(--ink-inverse)',
        },
        authority: {
          deep: 'var(--authority-deep)',
          mid: 'var(--authority-mid)',
          light: 'var(--authority-light)',
        },
        accent: {
          gold: 'var(--accent-gold)',
          'gold-light': 'var(--accent-gold-light)',
          'gold-dim': 'var(--accent-gold-dim)',
        },
        status: {
          success: 'var(--status-success)',
          'success-bg': 'var(--status-success-bg)',
          warning: 'var(--status-warning)',
          'warning-bg': 'var(--status-warning-bg)',
          error: 'var(--status-error)',
          'error-bg': 'var(--status-error-bg)',
          info: 'var(--status-info)',
          'info-bg': 'var(--status-info-bg)',
        },
        cite: {
          law: 'var(--cite-law)',
          'law-bg': 'var(--cite-law-bg)',
          precedent: 'var(--cite-precedent)',
          'precedent-bg': 'var(--cite-precedent-bg)',
          admin: 'var(--cite-admin)',
          'admin-bg': 'var(--cite-admin-bg)',
        },
        border: {
          default: 'var(--border-default)',
          subtle: 'var(--border-subtle)',
          strong: 'var(--border-strong)',
        },
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
export default config;
