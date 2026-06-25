import { useEffect, useRef, useSyncExternalStore } from 'react';

interface ModalStackEntry {
  id: string;
  token: symbol;
}

const modalStack: ModalStackEntry[] = [];
const listeners = new Set<() => void>();
let stackVersion = 0;

function emitChange() {
  stackVersion++;
  listeners.forEach((listener) => {
    listener();
  });
}

function registerModal(entry: ModalStackEntry) {
  modalStack.push(entry);
  emitChange();

  return () => {
    const index = modalStack.findIndex((item) => item.token === entry.token);

    if (index !== -1) {
      modalStack.splice(index, 1);
      emitChange();
    }
  };
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getStackVersion() {
  return stackVersion;
}

function getServerSnapshot() {
  return 0;
}

export function useModalStackInfo(id: string) {
  const tokenRef = useRef<symbol | null>(null);

  if (!tokenRef.current) {
    tokenRef.current = Symbol(id);
  }

  useEffect(() => {
    if (!tokenRef.current) return;

    return registerModal({ id, token: tokenRef.current });
  }, [id]);

  useSyncExternalStore(subscribe, getStackVersion, getServerSnapshot);

  const stackIndex = modalStack.findIndex((item) => item.token === tokenRef.current);
  const topIndex = modalStack.length - 1;

  return {
    isTopModal: stackIndex !== -1 && stackIndex === topIndex,
    stackIndex: stackIndex === -1 ? 0 : stackIndex,
  };
}

export function useIsTopModal(id: string) {
  return useModalStackInfo(id).isTopModal;
}
