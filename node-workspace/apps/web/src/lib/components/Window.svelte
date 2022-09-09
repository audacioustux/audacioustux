<script lang="ts" context="module">
	import { readable, writable } from 'svelte/store';

	const mouse_cord = writable({ x: 0, y: 0 });
	const onMousemove = ({ x, y }: MouseEvent) => {
		mouse_cord.set({ x, y });
	};
</script>

<svelte:window on:mousemove={onMousemove} />
