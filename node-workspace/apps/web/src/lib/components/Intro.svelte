<script context="module" lang="ts">
	// flatten - remove alpha channel from image - for smaller size
	import bgImgSrcsetAvif from '$lib/assets/absurd_design/UwU.png?avif&srcset&w=800;1000;1200;1600&background=rgb(248,250,252)&flatten&imagetools';
	import bgImgSrcsetWebp from '$lib/assets/absurd_design/UwU.png?webp&srcset&w=800;1000;1200;1600&background=rgb(248,250,252)&flatten&imagetools';
</script>

<section
	class="relative grid place-content-center min-h-screen-min py-8 font-serif antialiased select-none"
>
	<picture class="absolute opacity-5 pointer-events-none h-full w-full py-16">
		<source srcset={bgImgSrcsetAvif} type="image/avif" />
		<source srcset={bgImgSrcsetWebp} type="image/webp" />
		<img alt="" class="object-contain object-center h-full w-full" />
	</picture>
	<div
		class="prose prose-slate my-8"
		style:font-size="clamp(1rem, 3vw, 3rem)"
		style:width="min(1536px, 80vw)"
	>
		<h3 role="presentation">
			<em class="mr-2">Henlo!</em>
			<span aria-hidden="true">(ﾉ◕ヮ◕)ﾉ*:・ﾟ✧</span>
		</h3>
		<p class="break-wrap">
			I'm Tanjim Hossain / @audacioustux <br />
			An Übermensch Wannabe.. <br />
			Founder
			<a class="text-emerald-500" href="https://nobinalo.com" target="_blank">@NobinĀlo</a>
			& <br class="md:hidden" /> Researcher
			<a class="text-[rebeccapurple]" href="https://alo.dev" target="_blank">@ĀloLabs</a>
		</p>
	</div>
</section>

<style lang="postcss">
	a {
		@apply opacity-75 transition-opacity;
		&:hover {
			@apply opacity-100;
		}
	}
</style>
