import type { ContextFrom, EventFrom } from 'xstate';
import { createModel } from 'xstate/lib/model';

export const model = createModel({
    items: [{ title: 'Join In !! (´• ω •`)ﾉ', link: './' }],
    label: 'Pinned Links'
});

export const machine = model.createMachine({
    predictableActionArguments: true,
    context: model.initialContext,
    id: 'pinnedNav',
    type: 'parallel',
    states: {
        idle: {}
    }
});

export type MachineContext = ContextFrom<typeof model>;
export type MachineEvent = EventFrom<typeof model>;
