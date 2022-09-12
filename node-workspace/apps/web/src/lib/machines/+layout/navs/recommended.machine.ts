import type { ContextFrom, EventFrom } from 'xstate';
import { createModel } from 'xstate/lib/model';

export const model = createModel({
    items: [
        {
            title: 'Drop Me Anything!',
            subtitle: 'Anonymously.. <span aria-hidden="true">( ͡° ͜ʖ ͡°)</span>',
            link: './'
        },
        { title: 'Hire Me!', subtitle: 'As Dev? Designer? Assassin?', link: './' },
        {
            title: 'Buy Me a Coffee <span aria-hidden="true">UwU</span>',
            subtitle: 'For all the boolsh*t i do',
            link: './'
        },
        {
            title: 'Follow Me On The Internet..',
            subtitle: `And watch me suffer everyplace <span aria-hidden="true">ᵔ◡ᵔ</span>`,
            link: './'
        }
    ],
    label: 'Recommended Links',
    isVisible: true
},
    {
        events: {
            mouseIdle: () => ({}),
            mouseActive: () => ({})
        }
    });

export const machine = model.createMachine({
    predictableActionArguments: true,
    strict: true,
    context: model.initialContext,
    id: 'recommendedNav',
    initial: 'idle',
    states: {
        idle: {
            entry: 'hide',
            on: {
                mouseActive: 'active'
            },
        },
        active: {
            entry: 'show',
            on: {
                mouseIdle: 'idle'
            },
        }
    }
},
    {
        actions: {
            hide: model.assign({ isVisible: false }),
            show: model.assign({ isVisible: true }),
        }
    });

export type MachineContext = ContextFrom<typeof model>;
export type MachineEvent = EventFrom<typeof model>;
