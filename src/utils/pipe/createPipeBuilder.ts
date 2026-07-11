import { Store } from '@ilokesto/store';

import { PipeConfigurationError } from './errors';
import {
  capturePipeableMiddleware,
  getCapturedPipeMiddleware,
  getPipeableMiddlewareMetadata,
} from './metadata';
import type {
  Pipe,
  PipeBuilder,
  PipeCapability,
  PipeMiddlewareMetadata,
} from './types';
import { validatePipeMiddlewareAppend, validatePipeMiddlewareChain } from './validation';

function applyMiddleware(middleware: object, store: Store<unknown>): Store<unknown> {
  const callable = getCapturedPipeMiddleware(middleware);
  if (typeof callable !== 'function') {
    throw new PipeConfigurationError(
      'INVALID_METADATA',
      'Pipe middleware must have registered metadata',
      { id: '', ids: [] },
    );
  }

  const result: unknown = Reflect.apply(callable, undefined, [store]);
  if (!(result instanceof Store)) {
    const metadata = getPipeableMiddlewareMetadata(middleware);
    throw new PipeConfigurationError(
      'INVALID_MIDDLEWARE_RESULT',
      'Pipe middleware must return a Store',
      { id: metadata?.id ?? '', ids: metadata === undefined ? [] : [metadata.id] },
    );
  }

  return result;
}

function createBuilderUse<
  State,
  Capabilities extends readonly PipeCapability[],
  MetadataChain extends readonly PipeMiddlewareMetadata[],
>(chain: readonly object[]): PipeBuilder<State, Capabilities, MetadataChain>['use'];
function createBuilderUse(chain: readonly object[]): unknown {
  return (middleware: object) => {
    const captured = capturePipeableMiddleware(middleware);
    validatePipeMiddlewareAppend(chain, captured);
    return createPipeBuilder([...chain, captured]);
  };
}

function createBuilderCreate<
  State,
  Capabilities extends readonly PipeCapability[],
>(chain: readonly object[]): PipeBuilder<State, Capabilities>['create'];
function createBuilderCreate(chain: readonly object[]): unknown {
  return (initialState: unknown) => {
    if (initialState instanceof Store) {
      throw new PipeConfigurationError(
        'INVALID_STORE_INPUT',
        'Pipe builder create accepts plain state, not a Store',
        { id: '', ids: [] },
      );
    }

    validatePipeMiddlewareChain(chain);
    let store = new Store(initialState);
    for (const middleware of chain) {
      store = applyMiddleware(middleware, store);
    }

    return store;
  };
}

export function createPipeBuilder<
  State = unknown,
  Capabilities extends readonly PipeCapability[] = readonly [],
  MetadataChain extends readonly PipeMiddlewareMetadata[] = readonly [],
>(chain: readonly object[] = []): PipeBuilder<State, Capabilities, MetadataChain> {
  const snapshot = Object.freeze([...chain]);
  const builder: PipeBuilder<State, Capabilities, MetadataChain> = {
    use: createBuilderUse<State, Capabilities, MetadataChain>(snapshot),
    create: createBuilderCreate<State, Capabilities>(snapshot),
  };

  return Object.freeze(builder);
}

function createRootUse(): Pipe['use'];
function createRootUse(): unknown {
  return (middleware: object) => {
    const captured = capturePipeableMiddleware(middleware);
    validatePipeMiddlewareAppend([], captured);
    return createPipeBuilder([captured]);
  };
}

export const pipe: Pipe = Object.freeze({ use: createRootUse() });
