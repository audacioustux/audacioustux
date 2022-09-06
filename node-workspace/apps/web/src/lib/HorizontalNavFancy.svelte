<script lang="ts">
	export let items: { link: string; title: string; subtitle: string }[];
	export let aria_labelledby: string;
</script>

<nav
	aria-labelledby={aria_labelledby}
	class="px-2 overflow-x-scroll will-change-scroll scrollbar-hidden snap-x snap-proximity scroll-px-2 pointer-events-auto"
>
	<ul class="flex space-x-2 flex-nowrap w-fit">
		{#each items as { link, subtitle, title }}
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
