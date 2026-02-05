/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Microsoft-inspired colors
        'ms-blue': '#0078d4',
        'ms-blue-dark': '#106ebe',
        'ms-green': '#107c10',
        'ms-yellow': '#ffb900',
        'ms-red': '#d13438',
      },
    },
  },
  plugins: [],
}
