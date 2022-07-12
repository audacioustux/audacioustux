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
        "noto-color-emoji": ['"Noto Color Emoji"', 'sans-serif'],
      },
      colors: {
        transparent: 'transparent',
        current: 'currentColor',
      },
      minHeight: {
        'screen-min': '100vmin',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      }
    }
  },
  plugins: [require('tailwind-children'), require('@tailwindcss/typography')],
}
