const isDev = /^dev\w*$/i.test(process.env.NODE_ENV);

const config = {
	plugins: [
		require('tailwindcss/nesting'),
		require('tailwindcss'),
		require('postcss-preset-env')({ stage: 1, features: { 'nesting-rules': false } }),
		require('postcss-scrollbar'),
		require('./postcss.plugins.cjs')
	]
};

if (!isDev)
	config.plugins.push(
		require('cssnano')({ preset: 'default' }),
		require('postcss-variable-compress')
	);

module.exports = config;
