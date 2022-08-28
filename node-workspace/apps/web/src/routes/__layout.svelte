<script lang="ts">
	import '../app.css';

	const quickaccess_nav_items = [
		{ title: 'All Thoughts', link: './' },
		{ title: 'Music Stream ヾ(´〇`)ﾉ♪♪♪', link: './' },
		{ title: 'My Beliefs', link: './' },
		{ title: "Books I've Read", link: './' },
		{ title: "Podcasts I've Listened", link: './' },
		{ title: '2022', link: './' }
	];
	const pinned_nav_items = [{ title: 'Sign In ! ヾ(・ω・`)ノ', link: './' }];
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
	<header class="sticky top-0 z-40 snap-end p-2 pointer-events-none">
		<nav aria-labelledby="primary-navigation" class="flex">
			<ul
				aria-labelledby="quick-access"
				class="flex space-x-2 flex-grow overflow-x-auto overscroll-contain will-change-scroll no-scrollbar pointer-events-auto"
			>
				{#each quickaccess_nav_items as { link, title }}
					<a href={link}>
						<li
							class="truncate max-w-sm select-none bg-slate-50/95 border border-slate-200 px-2 rounded text-slate-700"
						>
							{title}
						</li>
					</a>
				{/each}
			</ul>
			<ul aria-labelledby="pinned" class="flex space-x-2 pointer-events-auto">
				{#each pinned_nav_items as { link, title }}
					<a href={link}>
						<li
							class="truncate max-w-sm select-none bg-slate-50/95 border border-slate-200 px-2 rounded text-slate-700 whitespace-nowrap"
						>
							{title}
						</li>
					</a>
				{/each}
			</ul>
		</nav>
	</header>
	<main
		class="relative snap-start rounded-2xl overflow-hidden my-4 shadow-y-2xl bg-slate-50 shadow-slate-50"
	>
		<slot />
	</main>
	<footer class="sticky bottom-0 z-40 snap-start p-2 flex flex-col space-y-2 pointer-events-none">
		<nav aria-labelledby="recommended-navigation" class="flex">
			<ul
				class="flex space-x-2 overflow-x-auto overscroll-contain will-change-scroll no-scrollbar pointer-events-auto snap-x snap-proximity"
			>
				{#each recommended_nav_items as { link, subtitle, title }}
					<a href={link}>
						<li
							class="max-w-md truncate snap-start select-none bg-slate-50/95 border border-slate-200 pl-4 pr-12 py-2 rounded text-slate-700 whitespace-nowrap"
						>
							<span class="font-semibold">{title}</span><br />
							<span class="font-light">{subtitle}</span>
						</li>
					</a>
				{/each}
			</ul>
		</nav>
		<nav aria-labelledby="history-navigation" class="flex">
			<ul
				aria-labelledby="quick-access"
				class="flex space-x-2 flex-grow overflow-x-auto overscroll-contain will-change-scroll no-scrollbar pointer-events-auto"
			>
				{#each history_nav_items as { link, title }}
					<a href={link}>
						<li
							class="truncate max-w-sm select-none bg-slate-50/95 border border-slate-200 px-2 rounded text-slate-700 whitespace-nowrap"
						>
							{title}
						</li>
					</a>
				{/each}
			</ul>
		</nav>
	</footer>
</div>

<style type="postcss">
	:global(body) {
		overflow: hidden;
	}
</style>
