<script lang="ts">
	import backgroundImage from '$lib/assets/absurd_design/UwU.png?webp&imagetools';
</script>

<svelte:head>
	<title>@audacioustux λ Tanjim Hossain</title>
	<meta name="description" content="@AudaciousTux - An Übermensch Wannabe" />
</svelte:head>

<section class="h-screen overflow-y-auto will-change-scroll snap-y child-section:snap-end">
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
		<section id="about">
			<div class="body prose prose-slate md:prose-2xl">
				<article>
					<p>
						Born on <time datetime="1998-01-11">'98</time> and currently living in
						<a href="https://wikipedia.org/wiki/Dhaka" target="_blank">Dhaka</a>.
					</p>
					<p>
						<b>Interests:</b> I've learned a few bits of <abbr title="Computer Science">CS</abbr>
						related stuffs since <time datetime="2012">'12</time>, enough to survive on bread and
						butter. Interested in Distributed Systems, Systems Science, Philosophy.., and anything
						that can potentially help me getting closer to "The Truth" ( if there's any ). Also, I
						like to meet new people, and observe their thought process.
					</p>
					<p>
						<b>Ideologies and Views:</b> Don't want to be part of any cult. But I do like the
						concept of Übermensch by Fredric Nietzche. For pragmatism's sake, I label myself as an
						agnostic, but it's a bit more complicated than that. <br />
						I'm not too optimistic to think that we can always resolve every conflict through negotiation,
						discussions, and compromise. But I do think it's not always the case.
						<br />
						I tend to be very vocal about corruption in Academia, more on
						<abbr title="Computer Science Education">CS Ed</abbr>. To me, Academia has the power to
						change a lot of things in our society. But it's being under-utilized or exploited for
						economic, political, and socio-political gains. I've been working on something to
						address this since '17 and named it
						<a class="text-emerald-500" href="https://nobinalo.com">NobinĀlo</a>.
					</p>
					<p>
						<b>Short-term Goals:</b> Revolutionize how people learn, understand, and create. Give
						Scientists the tools to diagnose and cure the world's ills and artists the tools to
						create and share beauties in ways currently impossible. <br />
						<b>Long-term Goals:</b> Reform our infantilized society. Give people the tools to resist
						and destroy consumer culture ( ubiquitous emotionally manipulative branding and
						advertising, materialism, artificial fashions ) and the corporation's oligarchical
						control over employment, entertainment, and creativity. Return power, dignity, and
						responsibility to the individual. <br />
						<b>Stretch goal:</b> Fall in love.
					</p>
				</article>
			</div>
		</section>
	</section>
	<section
		class="bg-gradient-to-b from-slate-100 to-slate-200 outline outline-4 outline-slate-200"
	/>
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
			width: min(1408px, calc(80vw + 1rem));
			a {
				@apply opacity-75 hover:opacity-100 transition-opacity;
			}
		}
	}

	#about {
		@apply py-[2em];
		.body {
			@apply font-playfair;
			@apply container mx-auto px-8;
		}
	}
</style>
