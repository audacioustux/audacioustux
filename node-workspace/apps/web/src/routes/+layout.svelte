<script context="module" lang="ts">
	import '@fontsource/work-sans/variable-full.css';
	import '@fontsource/playfair-display/variable.css';
	import '../app.postcss';

	// TODO: remove kaoemojis from screen readers `aria-hidden="true"`
	const related_nav = {
		items: [
			{ title: 'All Thoughts', link: './' },
			{ title: 'Music Stream ヾ(´〇`)ﾉ♪♪♪', link: './' },
			{ title: 'My Beliefs', link: './' },
			{ title: "Books I've Read", link: './' },
			{ title: "Podcasts I've Listened", link: './' },
			{ title: '2022', link: './' }
		],
		label: 'Quick Access Links'
	};
	const pinned_nav = {
		items: [{ title: 'Join In !! (´• ω •`)ﾉ', link: './' }],
		label: 'Pinned Links'
	};
	const history_nav = {
		items: [{ title: '~', link: './' }],
		label: 'History'
	};
	const recommended_nav = {
		items: [
			{
				title: 'Drop Me Anything!',
				subtitle: 'Anonymously.. <span aria-hidden="true">( ͡° ͜ʖ ͡°)</span>',
				link: './'
			},
			{ title: 'Hire Me!', subtitle: 'As Dev? Designer? Assassin?', link: './' },
			{ title: 'Buy Me a Coffee UwU', subtitle: 'For all the boolsh*t i do', link: './' },
			{
				title: 'Follow Me On The Internet..',
				subtitle: `And watch me suffer everyplace ᵔ◡ᵔ`,
				link: './'
			}
		],
		label: 'Recommended Links'
	};
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import { useMachine } from '@xstate/svelte';
	import { inspect } from '@xstate/inspect';
	import { machine as appMachine } from '$lib/machines/+layout.machine';

	import { browser, dev } from '$app/environment';

	if (browser && dev) inspect({ iframe: false });

	const machineOptions = { devTools: dev };
	const { state, service } = useMachine(appMachine, machineOptions);

	const {
		context: { navigationMenus }
	} = $state;

	service.onTransition((state) => {
		console.log(state.value);
	});

	console.log(navigationMenus);
	onMount(() => {
		// send('READY');
	});
</script>

<!-- general layer -->
<main
	class="overflow-auto w-screen h-screen bg-slate-50 text-slate-700 will-change-scroll scrollbar-hidden"
>
	<slot />
</main>

<!-- overlay layer -->
<div
	class="absolute top-0 left-0 pointer-events-none select-none w-screen h-screen overflow-hidden isolate contain-none text-sm"
>
	<div class="flex justify-between my-2 fixed top-0 z-40 w-full">
		<nav
			aria-label={related_nav.label}
			class="px-2 overflow-x-scroll will-change-scroll scrollbar-hidden pointer-events-auto"
		>
			<ul class="flex space-x-2 flex-nowrap w-fit">
				{#each related_nav.items as { link, title }}
					<li class="flex-initial">
						<a href={link}>
							<div
								class="max-w-sm truncate select-none bg-slate-50/95 border border-slate-200 px-2 rounded"
							>
								<span>{title}</span>
							</div>
						</a>
					</li>
				{/each}
			</ul>
		</nav>
		<nav
			aria-label={pinned_nav.label}
			class="px-2 overflow-x-scroll will-change-scroll scrollbar-hidden pointer-events-auto"
		>
			<ul class="flex space-x-2 flex-nowrap w-fit">
				{#each pinned_nav.items as { link, title }}
					<li class="flex-initial">
						<a href={link}>
							<div
								class="max-w-sm truncate select-none bg-slate-50/95 border border-slate-200 px-2 rounded"
							>
								<span>{title}</span>
							</div>
						</a>
					</li>
				{/each}
			</ul>
		</nav>
	</div>
	<div class="flex flex-col space-y-2 my-2 fixed bottom-0 z-40 w-full">
		<nav
			aria-label={recommended_nav.label}
			class="px-2 overflow-x-scroll will-change-scroll scrollbar-hidden snap-x snap-proximity scroll-px-2 pointer-events-auto"
		>
			<ul class="flex space-x-2 flex-nowrap w-fit">
				{#each recommended_nav.items as { link, subtitle, title }}
					<li class="snap-start flex-initial">
						<a href={link}>
							<div
								class="max-w-md truncate select-none bg-slate-50/95 border border-slate-200 pl-4 pr-12 py-2 rounded"
							>
								<span class="font-semibold font-serif">{@html title}</span><br />
								<span class="font-light">{@html subtitle}</span>
							</div>
						</a>
					</li>
				{/each}
			</ul>
		</nav>
		<nav
			aria-label={history_nav.label}
			class="px-2 overflow-x-scroll will-change-scroll scrollbar-hidden pointer-events-auto"
		>
			<ul class="flex space-x-2 flex-nowrap w-fit">
				{#each history_nav.items as { link, title }}
					<li class="flex-initial">
						<a href={link}>
							<div
								class="max-w-sm truncate select-none bg-slate-50/95 border border-slate-200 px-2 rounded"
							>
								<span>{title}</span>
							</div>
						</a>
					</li>
				{/each}
			</ul>
		</nav>
	</div>
</div>

<style type="postcss">
</style>
