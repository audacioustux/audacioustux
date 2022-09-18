import adapter from '@sveltejs/adapter-auto';
import preprocess from 'svelte-preprocess';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: [
		preprocess({
			postcss: true
		})
	],
	kit: {
		adapter: adapter()

		// NOTE: inline causes links to be broken
		// inlineStyleThreshold: 32 * 1024
	}
};

export default config;
