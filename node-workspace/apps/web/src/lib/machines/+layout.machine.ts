import { spawn, type ActorRefFrom, type ContextFrom, type EventFrom } from 'xstate';
import { createModel } from 'xstate/lib/model';
import * as recommendedNav from './components/navs/recommended.machine';

export const model = createModel(
    {
        navigationMenus: {
            recommended: undefined as Maybe<recommendedNav.AsActorType>
        }
    }
);

export const machine = model.createMachine({
    id: "layout",
    predictableActionArguments: true,
    context: model.initialContext,
    type: "parallel",
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
                    },
                }
            }
        }
    }
}, {
    actions: {
        initializeNavigationMenus: model.assign({
            navigationMenus: ({ navigationMenus }) => ({
                ...navigationMenus,
                recommended: spawn(recommendedNav.machine)
            })
        })
    }
});

export type AsActorType = ActorRefFrom<typeof machine>;
export type MachineContext = ContextFrom<typeof model>;
export type MachineEvent = EventFrom<typeof model>;