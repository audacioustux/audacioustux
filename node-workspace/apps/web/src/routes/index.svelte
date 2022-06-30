<script context="module" lang="ts">
</script>

<script lang="ts">
</script>

<svelte:head>
	<title>@audacioustux λ Tanjim Hossain</title>
	<meta name="description" content="@AudaciousTux's Laboratory" />
</svelte:head>

<section>
	<section
		class="greeting relative grid place-content-center min-h-[100vmin] py-32 font-playfair-serif"
	>
		<img
			class="background absolute object-contain object-center h-full w-full opacity-5 pointer-events-none"
			src="UwU.png"
			alt=""
		/>
		<div class="body prose prose-slate">
			<h3>
				<em class="mr-2">Henlo!</em>
				<span aria-hidden="true">(ﾉ◕ヮ◕)ﾉ*:・ﾟ✧</span>
			</h3>
			<p class="break-wrap">
				I'm Tanjim Hossain / @audacioustux<br />
				Optimist, Agnostic, Extrovert, Explorer<br />
				Founder
				<a
					class="text-emerald-500 opacity-75 hover:opacity-100 transition-opacity"
					href="https://nobinalo.com"
					target="_blank">@NobinĀlo</a
				>
				& <br class="md:hidden" /> Researcher
				<a
					class="text-[rebeccapurple] opacity-75 hover:opacity-100 transition-opacity"
					href="https://alo.dev"
					target="_blank">@ĀloLabs</a
				>
			</p>
		</div>
	</section>
</section>

<style lang="postcss">
	.greeting {
		@apply bg-gradient-to-b from-purple-50 via-pink-50;
		& > .body {
			margin-inline: auto;
			width: min(1408px, calc(80vw + 1rem));
			font-size: clamp(1rem, 4vw, 3rem);
		}
	}
</style>
