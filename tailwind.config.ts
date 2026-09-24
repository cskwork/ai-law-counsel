import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

// 민원 창구 토큰: globals.css의 RGB 채널 변수를 참조 (opacity modifier 지원)
const channel = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sign: ['var(--font-sign)'],
        body: ['var(--font-body)'],
        led: ['var(--font-led)'],
      },
      colors: {
        ground: channel('ground'),
        paper: { DEFAULT: channel('paper'), 2: channel('paper-2') },
        ink: { DEFAULT: channel('ink'), 2: channel('ink-2'), 3: channel('ink-3') },
        rule: { DEFAULT: channel('rule'), strong: channel('rule-strong') },
        sign: {
          DEFAULT: channel('sign'),
          hover: channel('sign-hover'),
          ink: channel('sign-ink'),
          'ink-2': channel('sign-ink-2'),
        },
        led: { DEFAULT: channel('led'), ground: channel('led-ground') },
        way: {
          law: channel('way-law'),
          'law-tint': channel('way-law-tint'),
          precedent: channel('way-precedent'),
          'precedent-tint': channel('way-precedent-tint'),
          admin: channel('way-admin'),
          'admin-ink': channel('way-admin-ink'),
          'admin-tint': channel('way-admin-tint'),
        },
        ok: channel('ok'),
        warn: { DEFAULT: channel('warn'), tint: channel('warn-tint') },
        error: { DEFAULT: channel('error'), tint: channel('error-tint') },
      },
      boxShadow: {
        paper: 'var(--shadow-paper)',
        lift: 'var(--shadow-lift)',
      },
      borderRadius: {
        chip: '3px',
      },
    },
  },
  plugins: [typography],
};
export default config;
