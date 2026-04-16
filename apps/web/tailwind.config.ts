/**
 * UbiVibe Tailwind Configuration
 *
 * Tailwind v4 with @tailwindcss/postcss handles content detection
 * automatically — the content array below is a fallback only.
 * Theme tokens are defined in app/globals.css via @theme inline.
 */

import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    './contexts/**/*.{ts,tsx}',
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
      borderRadius: {
        card: '12px',
        input: '8px',
      },
    },
  },
  plugins: [],
}

export default config
