/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        vibe: {
          blue: '#4F8EFF',
          purple: '#A855F7',
          pink: '#EC4899',
        }
      },
      backgroundImage: {
        'vibe-gradient': 'linear-gradient(180deg, #4F8EFF 0%, #A855F7 50%, #EC4899 100%)',
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
      }
    },
  },
  plugins: [],
}
