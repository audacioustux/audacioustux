/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        mono: ['"Fira Mono"'],
        "playfair-serif": ['"Playfair Display"'],
      },
      colors: {
        transparent: 'transparent',
        current: 'currentColor',
      },
    }
  },
  plugins: [require('tailwind-children'), require('@tailwindcss/typography')],
}
