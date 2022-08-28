const plugin = require('tailwindcss/plugin')
const colors = require('tailwindcss/colors')

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        "playfair": ['"Playfair Display"', 'serif'],
      },
      colors: {
        transparent: 'transparent',
        current: 'currentColor',
      },
      minHeight: {
        'screen-min': '100vmin',
      },
      boxShadow: {
        'y-2xl': '0 -25px 50px -12px rgba(0, 0, 0, 0.25), 0 25px 50px -12px rgb(0 0 0 / 0.25);',
      }
    }
  },
  plugins: [require('tailwind-children'), require('@tailwindcss/typography')],
}
