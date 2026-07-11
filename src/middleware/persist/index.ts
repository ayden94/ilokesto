import { Store } from '@ilokesto/store';
import { getStore } from '../../lib/getStore';
import { definePipeableMiddleware } from '../../utils/pipe/metadata';
import type { PipeableMiddleware } from '../../utils/pipe/metadata';
import type { PipeAnyMiddleware, PipeMiddlewareMetadata } from '../../utils/pipe/types';
import { MigrationFn, PersistConfig } from './Persist';
import { getStorage, parseOptions, setStorage } from './persistUtils';

type CurriedPersist = (<T>(initialState: T | Store<T>) => Store<T>) &
  PipeableMiddleware<
    PipeAnyMiddleware,
    PipeMiddlewareMetadata<'@ilokesto/state/persist', readonly [], readonly [], 'reject'>
  >;

const applyPersist = <T, P extends Array<MigrationFn>>(
  initialState: T | Store<T>,
  options: PersistConfig<T, P>,
): Store<T> => {
  const store = getStore(initialState);
  const baseSetState = store.setState.bind(store);
  const optionObj = parseOptions(options);
  const initialValue = optionObj.storageType
    ? getStorage({ ...optionObj, initState: store.getState() as T }).state
    : (store.getState() as T);

  baseSetState(initialValue);

  if (optionObj.storageType) {
    let prevPersistedState = initialValue;

    store.pushMiddleware((nextState, next) => {
      next(nextState);

      const currentState = store.getState() as T;

      if (!Object.is(prevPersistedState, currentState)) {
        setStorage({ ...optionObj, value: currentState });
        prevPersistedState = currentState;
      }
    });
  }

  return store;
};

export function persist<T, P extends Array<MigrationFn>>(
  initialState: T | Store<T>,
  options: PersistConfig<T, P>,
): Store<T>;
export function persist<P extends Array<MigrationFn>>(
  options: PersistConfig<unknown, P>,
): CurriedPersist;
export function persist<T, P extends Array<MigrationFn>>(
  first: T | Store<T> | PersistConfig<unknown, P>,
  second?: PersistConfig<T, P>,
) {
  if (arguments.length === 1) {
    const options = first as PersistConfig<unknown, P>;

    return definePipeableMiddleware(
      <State>(initialState: State | Store<State>) =>
        applyPersist<State, P>(initialState, options as PersistConfig<State, P>),
      {
        adds: [],
        after: [],
        before: [],
        duplicate: 'reject',
        id: '@ilokesto/state/persist',
        requires: [],
      } as const,
    );
  }

  return applyPersist(first as T | Store<T>, second as PersistConfig<T, P>);
}
