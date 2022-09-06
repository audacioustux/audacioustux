<script context="module" lang="ts">
	import '@fontsource/work-sans/variable-full.css';
	import '@fontsource/playfair-display/variable.css';
	import '../app.postcss';

	const quickaccess_nav_items = [
		{ title: 'All Thoughts', link: './' },
		{ title: 'Music Stream ヾ(´〇`)ﾉ♪♪♪', link: './' },
		{ title: 'My Beliefs', link: './' },
		{ title: "Books I've Read", link: './' },
		{ title: "Podcasts I've Listened", link: './' },
		{ title: '2022', link: './' }
	];
	const pinned_nav_items = [{ title: 'Join In !! (´• ω •`)ﾉ', link: './' }];
	const history_nav_items = [{ title: '~', link: './' }];
	const recommended_nav_items = [
		{
			title: 'Drop Me Anything!',
			subtitle: 'Anonymously.. ( ͡° ͜ʖ ͡°)',
			link: './'
		},
		{ title: 'Hire Me!', subtitle: 'As Dev? Designer? Assassin?', link: './' },
		{ title: 'Buy Me A Coffee UwU', subtitle: 'For all the boolsh*t i do', link: './' },
		{
			title: 'Follow Me On The Internet..',
			subtitle: `And watch me suffer everyplace ᵔ◡ᵔ`,
			link: './'
		}
	];
	import SvelteWindow from '$lib/SvelteWindow.svelte';
</script>

<script lang="ts">
	import HorizontalNavSimple from '$lib/HorizontalNavSimple.svelte';
	import HorizontalNavFancy from '$lib/HorizontalNavFancy.svelte';
</script>

<!-- general layer -->
<main
	class="overflow-auto w-screen h-screen bg-slate-50 text-slate-700 will-change-scroll scrollbar-hidden"
>
	<SvelteWindow />
	<slot />
</main>
<!-- opacity-0 invisible transition-visibility -->
<!-- overlay layer -->
<div
	class="absolute top-0 left-0 pointer-events-none select-none w-screen h-screen overflow-hidden isolate contain-none text-sm"
>
	<div class="flex justify-between my-2 fixed top-0 z-40 w-full">
		<HorizontalNavSimple items={quickaccess_nav_items} aria_labelledby="quickaccess-navigation" />
		<HorizontalNavSimple items={pinned_nav_items} aria_labelledby="pinned-navigation" />
	</div>
	<div class="flex flex-col space-y-2 my-2 fixed bottom-0 z-40 w-full">
		<HorizontalNavFancy items={recommended_nav_items} aria_labelledby="recommended-navigation" />
		<HorizontalNavSimple items={history_nav_items} aria_labelledby="history-navigation" />
	</div>
</div>

<style type="postcss">
</style>
