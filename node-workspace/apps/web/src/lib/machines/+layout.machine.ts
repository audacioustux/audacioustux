import type { ContextFrom, EventFrom } from 'xstate';
import { createModel } from 'xstate/lib/model';
import * as recommendedNav from './+layout/navs/recommended.machine';
import * as pinnedNav from './+layout/navs/pinned.machine';
import * as historyNav from './+layout/navs/history.machine';
import * as relatedNav from './+layout/navs/related.machine';
import { forwardTo, send } from 'xstate/lib/actions';

export const model = createModel({
	window: {
		mousePosition: { x: undefined as Maybe<number>, y: undefined as Maybe<number> }
	}
}, {
	events: {
		mouseMove: ({ x, y }: MouseEvent) => ({ x, y }),
		mouseIdle: () => ({}),
		mouseActive: () => ({}),
	}
});

const forward = (events: string[]) => ({ to: ({ model: , machine }) => ({}) })

const updateWindowMousePosition = model.assign({
	window: ({ window }, { x, y }) => ({ ...window, mousePosition: { x, y } })
}, 'mouseMove');

export const machine = model.createMachine(
	{
		id: 'layout',
		predictableActionArguments: true,
		strict: true,
		context: model.initialContext,
		type: 'parallel',
		states: {
			navigationMenus: {
				type: 'parallel',
				states: {
					recommendedNav: {
						invoke: {
							id: recommendedNav.machine.id,
							src: recommendedNav.machine,
						},
						// TODO: refactor this to factory
						on: {
							...forward(['mouseIdle', 'mouseActive']).to(recommendedNav),
							// mouseIdle: { actions: send(recommendedNav.model.events.mouseIdle(), { to: recommendedNav.machine.id }) },
							// mouseActive: { actions: send(recommendedNav.model.events.mouseActive(), { to: recommendedNav.machine.id }) },
						}
					},
					// relatedNav: {
					// 	invoke: {
					// 		id: relatedNav.machine.id,
					// 		src: relatedNav.machine
					// 	},
					// 	on: {
					// 		mouseIdle: { actions: send(relatedNav.model.events.mouseIdle(), { to: recommendedNav.machine.id }) },
					// 	}
					// },
					// historyNav: {
					// 	invoke: {
					// 		id: historyNav.machine.id,
					// 		src: historyNav.machine
					// 	},
					// 	on: {
					// 		mouseIdle: { actions: send(historyNav.model.events.mouseIdle(), { to: recommendedNav.machine.id }) },
					// 	}
					// },
					// pinnedNav: {
					// 	invoke: {
					// 		id: pinnedNav.machine.id,
					// 		src: pinnedNav.machine
					// 	},
					// 	on: {
					// 		mouseIdle: { actions: send(pinnedNav.model.events.mouseIdle(), { to: recommendedNav.machine.id }) },
					// 	}
					// }
				}
			},
			window: {
				type: "parallel",
				states: {
					mouse: {
						type: "parallel",
						states: {
							listeningMouseMove: {
								on: {
									mouseMove: {
										actions: [
											updateWindowMousePosition,
											send({ type: 'mouseMove' }, { to: 'mouseIdleObserver' })
										]
									},
								},
								invoke: {
									id: 'mouseIdleObserver',
									src: 'mouseIdleObserver',
								},
							},
						}
					}
				}
			}
		},
	},
	{
		services: {
			mouseIdleObserver: () => (sendParent, onReceive) => {
				let timeout: Maybe<NodeJS.Timeout>;
				const clear = () => clearTimeout(timeout);
				const set = () => timeout = setTimeout(() => {
					sendParent(model.events.mouseIdle());
					timeout = undefined;
				}, 3000);
				const reset = () => { clear(); set(); };

				set();

				onReceive(() => {
					if (timeout) reset();
					else {
						sendParent(model.events.mouseActive());
						set();
					}
				});

				return () => clear();
			}
		}
	}
);

export type MachineContext = ContextFrom<typeof model>;
export type MachineEvent = EventFrom<typeof model>;
