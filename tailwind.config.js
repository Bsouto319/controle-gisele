/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#C4956A', light: '#d4aa88', dark: '#a67a52' },
        rose: { DEFAULT: '#C9A9A6', light: '#f5ede9', dark: '#a07a77' },
      },
    },
  },
  plugins: [],
}

