import type { ContextFrom, EventFrom } from 'xstate';
import { createModel } from 'xstate/lib/model';

export const model = createModel({
    items: [
        { title: 'All Thoughts', link: './' },
        { title: 'Music Stream ヾ(´〇`)ﾉ♪♪♪', link: './' },
        { title: 'My Beliefs', link: './' },
        { title: "Books I've Read", link: './' },
        { title: "Podcasts I've Listened", link: './' },
        { title: '2022', link: './' }
    ],
    label: 'Quick Access Links'
});

export const machine = model.createMachine({
    predictableActionArguments: true,
    context: model.initialContext,
    id: 'relatedNav',
    type: 'parallel',
    states: {
        idle: {}
    }
});

export type MachineContext = ContextFrom<typeof model>;
export type MachineEvent = EventFrom<typeof model>;
