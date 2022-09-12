import type { ContextFrom, EventFrom } from 'xstate';
import { createModel } from 'xstate/lib/model';

export const model = createModel({
    items: [{ title: '~', link: './' }],
    label: 'History'
});

export const machine = model.createMachine({
    predictableActionArguments: true,
    context: model.initialContext,
    id: 'historyNav',
    type: 'parallel',
    states: {
        idle: {}
    }
});

export type MachineContext = ContextFrom<typeof model>;
export type MachineEvent = EventFrom<typeof model>;
