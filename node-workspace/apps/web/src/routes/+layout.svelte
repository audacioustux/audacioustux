<script context="module" lang="ts">
	// NOTE: https://github.com/sveltejs/kit/issues/6720
	import '@fontsource/work-sans/variable-full.css';
	import '@fontsource/playfair-display/variable.css';
	import '../app.postcss';
</script>

<script lang="ts">
	const onMousemove = (event: MouseEvent) => {};
</script>

<svelte:window on:mousemove={onMousemove} />

<!-- general layer -->
<main
	class="w-screen h-screen bg-slate-50 text-slate-700 will-change-scroll scrollbar-stable scroll-smooth"
>
	<slot />
</main>
