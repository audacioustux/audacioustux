<script context="module" lang="ts">
	// NOTE: https://github.com/sveltejs/kit/issues/6720
	import '@fontsource/work-sans/variable-full.css';
	import '@fontsource/playfair-display/variable.css';
	import '../app.postcss';

	import NavWithSubtitle from '$lib/components/NavWithSubtitle.svelte';
	import { useMachine } from '@xstate/svelte';
	import { inspect } from '@xstate/inspect';
	import { machine as appMachine, model as appModel } from '$lib/machines/+layout.machine';
	import { browser, dev } from '$app/environment';
	import Nav from '$lib/components/Nav.svelte';
	import { pick } from 'radash';
</script>

<script lang="ts">
	if (browser && dev) inspect({ iframe: false });

	const machineOptions = { devTools: dev };
	const { state, send, service } = useMachine(appMachine, machineOptions);

	const {
		children: { recommendedNav, historyNav, pinnedNav, relatedNav }
	} = $state;

	const onMousemove = (event: MouseEvent) => {
		send(appModel.events.mouseMove(event));
	};
</script>

<svelte:window on:mousemove={onMousemove} />

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
		{#if $relatedNav}
			<Nav {...pick($relatedNav.context, ['items', 'label'])} />
		{/if}
		{#if $pinnedNav}
			<Nav {...pick($pinnedNav.context, ['items', 'label'])} />
		{/if}
	</div>
	<div class="flex flex-col space-y-2 my-2 fixed bottom-0 z-40 w-full">
		{#if $recommendedNav}
			<NavWithSubtitle {...pick($recommendedNav.context, ['items', 'label', 'isVisible'])} />
		{/if}
		{#if $historyNav}
			<Nav {...pick($historyNav.context, ['items', 'label'])} />
		{/if}
	</div>
</div>
