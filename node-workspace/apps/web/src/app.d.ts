/// <reference types="@sveltejs/kit" />

// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare namespace App {
	interface Locals {
		userid: string;
	}

	// interface Platform {}

	// interface Session {}

	// interface Stuff {}
}

declare module '*metadata&imagetools' {
	export const src: string;
	export const width: number;
	export const height: number;
}
declare module '*imagetools' {
	const src: string;
	export default src;
}

type Maybe<A> = A | undefined;
