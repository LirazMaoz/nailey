/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Heebo', 'system-ui', 'sans-serif'],
      },
      colors: {
        pink: {
          light: '#fce4ec',
          DEFAULT: '#f8a5c2',
          dark: '#e91e8c',
        },
        purple: {
          light: '#e8d5f5',
          DEFAULT: '#c56cd6',
          dark: '#6c3483',
          deeper: '#4a235a',
        },
      },
      backgroundImage: {
        'tech-gradient': 'linear-gradient(135deg, #6c3483 0%, #a569bd 100%)',
        'client-gradient': 'linear-gradient(135deg, #f8a5c2 0%, #c56cd6 100%)',
        'card-gradient': 'linear-gradient(135deg, #fff0f7 0%, #f3e5f5 100%)',
      },
    },
  },
  plugins: [],
};
