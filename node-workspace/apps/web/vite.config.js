import { sveltekit } from '@sveltejs/kit/vite';
import { imagetools } from 'vite-imagetools';

/** @type {import('vite').UserConfig} */
const config = {
	plugins: [sveltekit(), imagetools()],
	experimental: {
		useVitePreprocess: true
	},
	// TODO: suppress fonts being inlined in css - https://github.com/vitejs/vite/pull/8717
	build: { assetsInlineLimit: 2 * 1024 }
};

export default config;
