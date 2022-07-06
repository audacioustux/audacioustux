const plugin = require('tailwindcss/plugin')

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        mono: ['"Fira Mono"'],
        "playfair": ['"Playfair Display"', 'serif'],
        "unifont": ['"Unifont"', 'sans-serif'],
      },
      colors: {
        transparent: 'transparent',
        current: 'currentColor',
      },
      minHeight: {
        'screen-min': '100vmin',
      },
    }
  },
  plugins: [require('tailwind-children'), require('@tailwindcss/typography')],
}
