<script lang="ts">
	import '@fontsource/work-sans/variable-full.css';
	import '@fontsource/playfair-display/variable.css';
	import '../app.css';

	const quickaccess_nav_items = [
		{ title: 'All Thoughts', link: './' },
		{ title: 'Music Stream ヾ(´〇`)ﾉ♪♪♪', link: './' },
		{ title: 'My Beliefs', link: './' },
		{ title: "Books I've Read", link: './' },
		{ title: "Podcasts I've Listened", link: './' },
		{ title: '2022', link: './' }
	];
	const pinned_nav_items = [{ title: 'Join In !! ヽ(⌣◡⌣”)ﾉ', link: './' }];
	const history_nav_items = [{ title: '~', link: './' }];
	const recommended_nav_items = [
		{ title: 'Drop Me Anything!', subtitle: 'A Message? Link? Existential dread?', link: './' },
		{ title: 'Hire Me!', subtitle: 'As Dev? Designer? Assassin?', link: './' },
		{ title: 'Buy Me A Coffee UwU', subtitle: 'For all the boolsh*t i do', link: './' }
	];
</script>

<div
	class="h-screen w-screen overflow-auto overscroll-contain will-change-scroll snap-both scroll-smooth snap-proximity bg-slate-100"
>
	<!-- <header />
	<div class="flex justify-between sticky top-0 z-40 snap-start p-2 pointer-events-none">
		<nav
			aria-labelledby="quickaccess-navigation"
			class="overflow-x-auto overscroll-contain will-change-scroll no-scrollbar pointer-events-auto"
		>
			<ul class="flex space-x-2">
				{#each quickaccess_nav_items as { link, title }}
					<a href={link}>
						<li
							class="truncate max-w-sm select-none bg-slate-50/95 border border-slate-200 px-2 rounded"
						>
							{title}
						</li>
					</a>
				{/each}
			</ul>
		</nav>
		<nav
			aria-labelledby="pinned-navigation"
			class="overflow-x-auto overscroll-contain will-change-scroll no-scrollbar pointer-events-auto"
		>
			<ul class="flex space-x-2">
				{#each pinned_nav_items as { link, title }}
					<a href={link}>
						<li
							class="truncate max-w-sm select-none bg-slate-50/95 border border-slate-200 px-2 rounded whitespace-nowrap"
						>
							{title}
						</li>
					</a>
				{/each}
			</ul>
		</nav>
	</div> -->
	<main
		class="relative snap-start rounded-2xl overflow-hidden my-4 shadow-y-2xl shadow-slate-50 transition-[border-radius]"
	>
		<slot />
	</main>
	<div class="snap-start p-2 flex flex-col space-y-2 sticky bottom-0 z-40 pointer-events-none">
		<nav
			aria-labelledby="recommended-navigation"
			class="self-start overflow-x-auto overscroll-contain will-change-scroll no-scrollbar pointer-events-auto snap-x snap-proximity"
		>
			<ul class="flex space-x-2">
				{#each recommended_nav_items as { link, subtitle, title }}
					<a href={link}>
						<li
							class="max-w-md truncate snap-start select-none bg-slate-50/95 border border-slate-200 pl-4 pr-12 py-2 rounded whitespace-nowrap"
						>
							<span class="font-semibold font-serif">{title}</span><br />
							<span class="font-light">{subtitle}</span>
						</li>
					</a>
				{/each}
			</ul>
		</nav>
		<nav
			aria-labelledby="history-navigation"
			class="self-start overflow-x-auto overscroll-contain will-change-scroll no-scrollbar pointer-events-auto"
		>
			<ul class="flex space-x-2">
				{#each history_nav_items as { link, title }}
					<a href={link}>
						<li
							class="truncate max-w-sm select-none bg-slate-50/95 border border-slate-200 px-2 rounded whitespace-nowrap"
						>
							{title}
						</li>
					</a>
				{/each}
			</ul>
		</nav>
	</div>
	<footer />
</div>

<style type="postcss">
	:global(body) {
		overflow: hidden;
	}
</style>
