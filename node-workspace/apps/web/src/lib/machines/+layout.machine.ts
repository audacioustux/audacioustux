import { spawn, type ActorRefFrom, type ContextFrom, type EventFrom } from 'xstate';
import { createModel } from 'xstate/lib/model';
import * as recommendedNav from './+layout/navs/recommended.machine';

export const model = createModel({
	navigationMenus: {
		recommended: undefined as Maybe<recommendedNav.MachineActorRef>
	}
});

export const machine = model.createMachine(
	{
		id: 'Layout',
		predictableActionArguments: true,
		context: model.initialContext,
		type: 'parallel',
		states: {
			NavigationMenus: {
				type: 'parallel',
				states: {
					Recommended: {
						initial: 'Initializing',
						states: {
							Initializing: {
								entry: 'initializeNavigationMenus',
								always: 'Initialized'
							},
							Initialized: {}
						}
					}
				}
			}
		}
	},
	{
		actions: {
			initializeNavigationMenus: model.assign({
				navigationMenus: ({ navigationMenus }) => ({
					...navigationMenus,
					recommended: spawn(recommendedNav.machine)
				})
			})
		}
	}
);

export type MachineActorRef = ActorRefFrom<typeof machine>;
export type MachineContext = ContextFrom<typeof model>;
export type MachineEvent = EventFrom<typeof model>;
