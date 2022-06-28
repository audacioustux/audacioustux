<script context="module" lang="ts">
	import Icon from '@iconify/svelte';
	import githubOutline from '@iconify/icons-teenyicons/github-outline.js';
	import facebookOutline from '@iconify/icons-teenyicons/facebook-outline.js';
	import telegramOutline from '@iconify/icons-teenyicons/telegram-outline.js';
	import skypeOutline from '@iconify/icons-teenyicons/skype-outline.js';
	import linkedinOutline from '@iconify/icons-teenyicons/linkedin-outline.js';
	import spotifyOutline from '@iconify/icons-teenyicons/spotify-outline.js';
	import youtubeOutline from '@iconify/icons-teenyicons/youtube-outline.js';

	const brandColors = {
		facebook: '#3b5998',
		github: '#24292e',
		skype: '#00aff0',
		telegram: '#0088cc',
		linkedin: '#0077b5',
		spotify: '#1db954',
		youtube: '#ff0000'
	};
</script>

<script lang="ts">
</script>

<svelte:head>
	<title>@audacioustux •λ• Tanjim Hossain</title>
	<meta name="description" content="Personal Virtual Space of @audacioustux" />
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
			<h4>
				<em class="mr-2">Henlo!</em>
				<span aria-hidden="true">(ﾉ◕ヮ◕)ﾉ*:・ﾟ✧</span>
			</h4>
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
				>.
			</p>
			<address class="flex gap-x-[1.5em] items-center">
				<a
					href="https://github.com"
					target="_blank"
					class="opacity-75 hover:opacity-100 transition-opacity"
				>
					<Icon icon={githubOutline} color={brandColors.github} inline={true} />
				</a>
				<a
					href="https://linkedin.com/in/audacioustux/"
					target="_blank"
					class="opacity-75 hover:opacity-100 transition-opacity"
				>
					<Icon icon={linkedinOutline} color={brandColors.linkedin} inline={true} />
				</a>
				<a
					href="https://facebook.com/audacioustux"
					target="_blank"
					class="opacity-75 hover:opacity-100 transition-opacity"
				>
					<Icon icon={facebookOutline} color={brandColors.facebook} inline={true} />
				</a>
				<a
					href="https://telegram.me/audacioustux"
					target="_blank"
					class="opacity-75 hover:opacity-100 transition-opacity"
				>
					<Icon icon={telegramOutline} color={brandColors.telegram} inline={true} />
				</a>
				<a
					href="skype:live:tangimhossain1?chat"
					target="_blank"
					class="opacity-75 hover:opacity-100 transition-opacity"
				>
					<Icon icon={skypeOutline} color={brandColors.skype} inline={true} />
				</a>
				<a
					href="https://open.spotify.com/user/tanjimhossain?si=4da1228efe3f466c"
					target="_blank"
					class="opacity-75 hover:opacity-100 transition-opacity"
				>
					<Icon icon={spotifyOutline} color={brandColors.spotify} inline={true} />
				</a>
				<a
					href="https://youtube.com/c/tangimhossain"
					target="_blank"
					class="opacity-75 hover:opacity-100 transition-opacity"
				>
					<Icon icon={youtubeOutline} color={brandColors.youtube} inline={true} />
				</a>
			</address>
		</div>
	</section>
</section>

<style lang="postcss">
	.greeting {
		@apply bg-gradient-to-b from-purple-100 via-pink-50;
		& > .body {
			margin-inline: auto;
			width: min(1408px, calc(80vw + 1rem));
			font-size: clamp(1rem, 4vw, 3rem);
		}
	}
</style>
