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
		adapter: adapter(),

		inlineStyleThreshold: 32 * 1024,
		alias: {
			$Components: './src/lib/Components',
			$Machines: './src/lib/Machines',
			$Utils: './src/lib/Utils',
			$Assets: './src/lib/Assets'
		}
	}
};

export default config;
