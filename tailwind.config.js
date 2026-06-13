/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', 'system-ui', 'sans-serif'],
        mono: ['Geist Mono', 'monospace'],
      },
      colors: {
        navy: {
          DEFAULT: '#0e1726',
          2: '#1c2d45',
          3: '#243650',
        },
      },
    },
  },
  plugins: [],
}
