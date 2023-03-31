<script lang="ts">
	// NOTE: https://github.com/sveltejs/kit/issues/6720
	import '@fontsource/work-sans/variable-full.css';
	import '@fontsource/playfair-display/variable.css';
	import '../app.postcss';
</script>

<!-- general layer -->
<main class="w-screen h-[100svh] will-change-scroll scrollbar-stable scroll-smooth">
	<slot />
</main>
