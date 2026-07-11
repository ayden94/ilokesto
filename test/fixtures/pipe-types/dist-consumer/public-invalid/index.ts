import { Store } from '@ilokesto/store';
import { definePipeableMiddleware, pipe } from '@ilokesto/state/utils';
import type { PipeAnyMiddleware } from '@ilokesto/state/utils';

type LegacyCallRejection<Root> = Root extends (...arguments_: never[]) => unknown
  ? unknown
  : { readonly __pipeCallableRootError: '__pipeCallableRootError' };

const identityMiddleware: PipeAnyMiddleware = (store) => store;
const identity = definePipeableMiddleware(identityMiddleware, { id: '@consumer/identity' } as const);
const rejectedLegacyCall: LegacyCallRejection<typeof pipe> = true;
const legacyStore = pipe({ count: 0 });
const rejectedStoreInput = pipe.use(identity).create(new Store({ count: 0 }));

rejectedLegacyCall;
legacyStore;
rejectedStoreInput;
