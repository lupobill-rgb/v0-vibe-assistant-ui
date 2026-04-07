/**
 * UbiVibe Tailwind Configuration
 *
 * STATUS: STAGED — not yet active.
 * Current stack uses CSS Modules (App.css / index.css).
 *
 * TO ACTIVATE — run in apps/web/:
 *   npm install -D tailwindcss @tailwindcss/forms @tailwindcss/typography
 *   npx tailwindcss init
 *   Add to index.css: @tailwind base; @tailwind components; @tailwind utilities;
 *
 * DO NOT remove CSS Modules until Tailwind is confirmed working.
 */

import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary:   '#00E5A0',
          secondary: '#7B61FF',
          accent:    '#00B4D8',
        },
        surface: {
          base:     '#0A0E17',
          elevated: '#0F1420',
          border:   '#1a2030',
          muted:    '#888888',
        },
        text: {
          primary:   '#E8ECF4',
          secondary: '#b0b0b0',
          muted:     '#666666',
        },
      },
      fontFamily: {
        sans: [
          'system-ui', '-apple-system', 'BlinkMacSystemFont',
          'Segoe UI', 'Roboto', 'Helvetica Neue', 'sans-serif',
        ],
        mono: ['Monaco', 'Courier New', 'monospace'],
      },
      borderRadius: {
        card: '12px',
        input: '8px',
      },
    },
  },
  plugins: [],
}

export default config
