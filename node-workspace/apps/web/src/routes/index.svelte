<script lang="ts">
	import { onMount } from 'svelte';
	import backgroundImage from '$lib/assets/absurd_design/UwU.png?webp&imagetools';

	onMount(() => {});
</script>

<svelte:head>
	<title>@audacioustux λ Tanjim Hossain</title>
	<meta name="description" content="@AudaciousTux - An Übermensch Wannabe" />
</svelte:head>

<section
	class="h-screen overflow-auto will-change-scroll snap-y child-section:snap-end scrollbar-thin"
>
	<section id="intro" class="bg-gradient-to-b from-slate-50 to-slate-100">
		<section id="greeting">
			<img class="background" src={backgroundImage} alt="" />
			<div class="body prose prose-slate">
				<h3>
					<em class="mr-2">Henlo!</em>
					<span aria-hidden="true">(ﾉ◕ヮ◕)ﾉ*:・ﾟ✧</span>
				</h3>
				<p class="break-wrap">
					I'm Tanjim Hossain / @audacioustux <br />
					An Übermensch Wannabe... <br />
					Founder
					<a class="text-emerald-500" href="https://nobinalo.com" target="_blank">@NobinĀlo</a>
					& <br class="md:hidden" /> Researcher
					<a class="text-[rebeccapurple]" href="https://alo.dev" target="_blank">@ĀloLabs</a>
				</p>
			</div>
		</section>
	</section>
	<section
		class="bg-gradient-to-b from-slate-100 to-slate-200 border-t border-slate-200 min-h-screen"
	>
		a
	</section>
</section>

<style lang="postcss">
	#greeting {
		@apply relative grid place-content-center min-h-screen-min py-32;
		@apply font-playfair;

		> .background {
			@apply absolute object-contain object-center h-full w-full;
			@apply opacity-5 pointer-events-none;
		}
		> .body {
			font-size: clamp(1rem, 4vw, 3rem);
			width: min(1536px, calc(80vw + 1rem));
			a {
				@apply opacity-75 hover:opacity-100 transition-opacity;
			}
		}
	}
</style>
