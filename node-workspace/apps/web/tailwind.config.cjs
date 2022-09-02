const plugin = require('tailwindcss/plugin')
const colors = require('tailwindcss/colors')
const defaultTheme = require('tailwindcss/defaultTheme')
const resolveConfig = require('tailwindcss/resolveConfig')

/** @type {import('tailwindcss').Config} */
const config = {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        'sans': ['"Work SansVariable"', ...defaultTheme.fontFamily.sans],
        'serif': ['"Playfair DisplayVariable"', ...defaultTheme.fontFamily.serif],
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
      },
    }
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}

module.exports = config;