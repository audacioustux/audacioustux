<script lang="ts">
	import backgroundImage from '$lib/assets/absurd_design/UwU.png?webp&imagetools';
</script>

<svelte:head>
	<title>@audacioustux λ Tanjim Hossain</title>
	<meta name="description" content="@AudaciousTux - An Übermensch Wannabe" />
</svelte:head>

<section id="greeting">
	<img class="background" src={backgroundImage} alt="" />
	<div class="body prose">
		<h3>
			<em class="mr-2">Henlo!</em>
			<span aria-hidden="true">(ﾉ◕ヮ◕)ﾉ*:・ﾟ✧</span>
		</h3>
		<p class="break-wrap">
			I'm Tanjim Hossain / @audacioustux<br />
			Optimist, Agnostic, Extrovert, Explorer<br />
			Founder
			<a class="text-emerald-500" href="https://nobinalo.com" target="_blank">@NobinĀlo</a>
			& <br class="md:hidden" /> Researcher
			<a class="text-[rebeccapurple]" href="https://alo.dev" target="_blank">@ĀloLabs</a>
		</p>
	</div>
</section>

<style lang="postcss">
	#greeting {
		@apply relative grid place-content-center min-h-screen-min py-32;
		@apply bg-gradient-to-b from-purple-50 via-pink-50;
		@apply font-playfair;

		> .background {
			@apply absolute object-contain object-center h-full w-full;
			@apply opacity-5 pointer-events-none;
		}
		> .body {
			width: min(1408px, calc(80vw + 1rem));
			font-size: clamp(1rem, 4vw, 3rem);
			a {
				@apply opacity-75 hover:opacity-100 transition-opacity;
			}
		}
	}
</style>
