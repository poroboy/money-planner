/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#10233f',
        mint: '#37d6b1',
        soft: '#f4f7fb',
        ink: '#172033'
      },
      boxShadow: {
        soft: '0 18px 60px rgba(16, 35, 63, 0.10)'
      }
    }
  },
  plugins: []
};
