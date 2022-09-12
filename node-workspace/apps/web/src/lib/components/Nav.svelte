<script lang="ts">
	export let label: string;
	export let items: { link: string; title: string }[];
</script>

<nav
	aria-label={label}
	class="px-2 overflow-x-scroll will-change-scroll scrollbar-hidden pointer-events-auto"
>
	<ul class="flex space-x-2 flex-nowrap w-fit">
		{#each items as { link, title }}
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
