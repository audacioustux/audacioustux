const plugin = require('tailwindcss/plugin');
const defaultTheme = require('tailwindcss/defaultTheme');

/** @type {import('tailwindcss').Config} */
const config = {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	darkMode: 'class',
	theme: {
		extend: {
			fontFamily: {
				sans: ['"Work SansVariable"', ...defaultTheme.fontFamily.sans],
				serif: ['"Playfair DisplayVariable"', ...defaultTheme.fontFamily.serif]
			},
			colors: {
				transparent: 'transparent',
				current: 'currentColor'
			},
			minHeight: {
				'screen-min': '100vmin'
			},
			boxShadow: {
				'y-2xl': '0 -25px 50px -12px rgba(0, 0, 0, 0.25), 0 25px 50px -12px rgb(0 0 0 / 0.25);'
			},
			transitionProperty: {
				visibility: 'opacity,  visibility'
			},
			backgroundImage: {
				'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))'
			}
		},
		contain: {
			none: 'none',
			strict: 'strict',
			content: 'content'
		}
	},
	plugins: [
		require('@tailwindcss/typography'),
		plugin(function ({ matchUtilities, theme }) {
			matchUtilities({ contain: (value) => ({ contain: value }) }, { values: theme('contain') });
		})
	]
};

module.exports = config;
