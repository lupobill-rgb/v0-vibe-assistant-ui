/**
 * VIBE Tailwind Configuration
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
          primary:   '#667eea',
          secondary: '#764ba2',
          accent:    '#f5576c',
        },
        surface: {
          base:     '#0a0a0a',
          elevated: '#1a1a1a',
          border:   '#333333',
          muted:    '#888888',
        },
        text: {
          primary:   '#e0e0e0',
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
