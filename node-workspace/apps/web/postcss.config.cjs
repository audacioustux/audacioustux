module.exports = {
	plugins: [
		require('tailwindcss/nesting'),
		require('tailwindcss'),
		require('postcss-preset-env')({ stage: 1, features: { 'nesting-rules': false } }),
		require('postcss-variable-compress'),
		require('postcss-scrollbar'),
		require('./postcss.plugins.cjs')
	]
};
