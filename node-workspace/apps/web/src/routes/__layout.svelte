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
	const pinned_nav_items = [{ title: 'Join In !! ヽ(⌣◡⌣”)ﾉ', link: './' }];
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
</script>

<!-- general layer -->
<main
	class="overflow-auto w-screen h-screen bg-slate-50 text-slate-700 will-change-scroll scrollbar-hidden"
>
	<slot />
</main>

<!-- overlay layer -->
<div
	class="absolute top-0 left-0 pointer-events-none select-none w-screen h-screen overflow-hidden isolate contain-none"
>
	<div class="flex justify-between my-2 fixed top-0 z-40 w-full">
		<nav
			aria-labelledby="quickaccess-navigation"
			class="px-2 overflow-x-scroll will-change-scroll scrollbar-hidden pointer-events-auto"
		>
			<ul class="flex space-x-2 flex-nowrap w-fit">
				{#each quickaccess_nav_items as { link, title }}
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
			aria-labelledby="pinned-navigation"
			class="px-2 overflow-x-scroll will-change-scroll scrollbar-hidden pointer-events-auto"
		>
			<ul class="flex space-x-2 flex-nowrap w-fit">
				{#each pinned_nav_items as { link, title }}
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
			aria-labelledby="recommended-navigation"
			class="px-2 overflow-x-scroll will-change-scroll scrollbar-hidden snap-x snap-proximity scroll-px-2 pointer-events-auto"
		>
			<ul class="flex space-x-2 flex-nowrap w-fit">
				{#each recommended_nav_items as { link, subtitle, title }}
					<li class="snap-start flex-initial">
						<a href={link}>
							<div
								class="max-w-md truncate select-none bg-slate-50/95 border border-slate-200 pl-4 pr-12 py-2 rounded"
							>
								<span class="font-semibold font-serif">{title}</span><br />
								<span class="font-light">{subtitle}</span>
							</div>
						</a>
					</li>
				{/each}
			</ul>
		</nav>
		<nav
			aria-labelledby="history-navigation"
			class="px-2 overflow-x-scroll will-change-scroll scrollbar-hidden pointer-events-auto"
		>
			<ul class="flex space-x-2 flex-nowrap w-fit">
				{#each history_nav_items as { link, title }}
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
