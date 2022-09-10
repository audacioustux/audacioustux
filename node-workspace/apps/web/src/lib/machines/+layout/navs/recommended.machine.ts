import type { ActorRefFrom, ContextFrom, EventFrom } from 'xstate';
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
    label: 'Recommended Links'
});

export const machine = model.createMachine({
    predictableActionArguments: true,
    context: model.initialContext,
    id: 'NavRecommended',
    type: 'parallel',
    states: {
        Idle: {}
    }
});

export type MachineActorRef = ActorRefFrom<typeof machine>;
export type MachineContext = ContextFrom<typeof model>;
export type MachineEvent = EventFrom<typeof model>;
