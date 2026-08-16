import React, { useMemo, useEffect } from 'react';
import { OverlayProvider } from '@ilokesto/overlay';
import type { OverlayStoreApi } from '@ilokesto/overlay';
import { ModalAdapter } from '../adapters/ModalAdapter';
import { globalStyles } from '../shared/styles';
import { globalModalStore } from '../facade/modalFacade';
import { createModalStackRuntime, ModalStackRuntimeContext } from '../hooks/useIsTopModal';
import { createModalLifecycleStore } from '../shared/lifecycle';

export interface ModalProviderProps {
  children: React.ReactNode;
  store?: OverlayStoreApi;
}

export function ModalProvider({ children, store }: ModalProviderProps) {
  const overlayStore = useMemo(
    () => store ? createModalLifecycleStore(store) : globalModalStore,
    [store]
  );
  const modalStackRuntime = useMemo(createModalStackRuntime, []);
  const adapters = useMemo(() => ({ modal: ModalAdapter }), []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const id = 'ilokesto-modal-styles';
    if (!document.getElementById(id)) {
      const style = document.createElement('style');
      style.id = id;
      style.textContent = globalStyles;
      document.head.appendChild(style);
    }
  }, []);

  return (
    <ModalStackRuntimeContext.Provider value={modalStackRuntime}>
      <OverlayProvider store={overlayStore} adapters={adapters}>
        {children}
      </OverlayProvider>
    </ModalStackRuntimeContext.Provider>
  );
}
