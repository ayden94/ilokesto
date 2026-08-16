import { createContext, useContext, useEffect, useRef, useSyncExternalStore } from 'react';
import type { RefObject } from 'react';

interface ModalStackEntry {
  readonly id: string;
  readonly token: symbol;
  readonly elementRef: RefObject<HTMLElement | null>;
}

interface ModalStackInfo {
  readonly isTopModal: boolean;
  readonly stackIndex: number;
  readonly containsTarget: (target: Node) => boolean;
}

export interface ModalStackRuntime {
  readonly register: (entry: ModalStackEntry) => () => void;
  readonly subscribe: (listener: () => void) => () => void;
  readonly getVersion: () => number;
  readonly getStackInfo: (token: symbol) => ModalStackInfo;
}

export function createModalStackRuntime(): ModalStackRuntime {
  const entries: ModalStackEntry[] = [];
  const listeners = new Set<() => void>();
  let version = 0;

  const emitChange = () => {
    version++;
    listeners.forEach((listener) => {
      listener();
    });
  };

  const containsTarget = (target: Node) => entries.some(
    (entry) => entry.elementRef.current?.contains(target) ?? false
  );

  return {
    register: (entry) => {
      entries.push(entry);
      emitChange();

      return () => {
        const index = entries.findIndex((item) => item.token === entry.token);

        if (index !== -1) {
          entries.splice(index, 1);
          emitChange();
        }
      };
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getVersion: () => version,
    getStackInfo: (token) => {
      const stackIndex = entries.findIndex((item) => item.token === token);

      return {
        isTopModal: stackIndex !== -1 && stackIndex === entries.length - 1,
        stackIndex: stackIndex === -1 ? 0 : stackIndex,
        containsTarget,
      };
    },
  };
}

function getServerSnapshot() {
  return 0;
}

export const ModalStackRuntimeContext = createContext<ModalStackRuntime | null>(null);

export function useModalStackInfo(id: string, elementRef: RefObject<HTMLElement | null>) {
  const runtime = useContext(ModalStackRuntimeContext);
  const tokenRef = useRef<symbol | null>(null);

  if (runtime === null) {
    throw new Error('Modal adapters must be rendered within a ModalProvider.');
  }

  if (!tokenRef.current) {
    tokenRef.current = Symbol(id);
  }

  useEffect(() => {
    if (!tokenRef.current) return;

    return runtime.register({ id, token: tokenRef.current, elementRef });
  }, [elementRef, id, runtime]);

  useSyncExternalStore(runtime.subscribe, runtime.getVersion, getServerSnapshot);

  return runtime.getStackInfo(tokenRef.current);
}

export function useIsTopModal(id: string, elementRef: RefObject<HTMLElement | null>) {
  return useModalStackInfo(id, elementRef).isTopModal;
}
