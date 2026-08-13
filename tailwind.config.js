export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        playfair: ['Playfair Display', 'serif'],
        caveat: ['Caveat', 'cursive'],
      }
    },
  },
  plugins: [],
  safelist: ['font-sans', 'font-mono', 'font-playfair', 'font-caveat'],
}
