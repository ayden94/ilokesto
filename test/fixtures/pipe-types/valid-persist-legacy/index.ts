import { Store } from '@ilokesto/store';

import { persist } from '../../../../src/middleware';
import { pipe } from '../../../../src/utils/pipe';

type CounterState = {
  readonly count: number;
};

const directLocal: Store<CounterState> = persist({ count: 0 }, { local: 'legacy-local' });
const directCookie: Store<CounterState> = persist(
  new Store({ count: 0 }),
  { cookie: 'legacy-cookie' },
);
const directSession: Store<CounterState> = persist(
  { count: 0 },
  { session: 'legacy-session' },
);
const directMigration: Store<CounterState> = persist(
  { count: 0 },
  {
    local: 'legacy-migration',
    migrate: [(state: { readonly value: number }) => ({ count: state.value })],
  },
);
const curriedLocal: Store<CounterState> = pipe
  .use(persist({ local: 'legacy-local-pipe' }))
  .create({ count: 0 });
const curriedCookie: Store<CounterState> = pipe
  .use(persist({ cookie: 'legacy-cookie-pipe' }))
  .create({ count: 0 });
const curriedSession: Store<CounterState> = pipe
  .use(persist({ session: 'legacy-session-pipe' }))
  .create({ count: 0 });

directLocal.getState().count;
directCookie.getState().count;
directSession.getState().count;
directMigration.getState().count;
curriedLocal.getState().count;
curriedCookie.getState().count;
curriedSession.getState().count;
