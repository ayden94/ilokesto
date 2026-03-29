import React, { useMemo, useEffect } from 'react';
import { OverlayProvider } from '@ilokesto/overlay';
import type { OverlayStoreApi } from '@ilokesto/overlay';
import { ModalAdapter } from './ModalAdapter';
import { globalStyles } from './styles';
import { globalModalStore } from './modalFacade';

export interface ModalProviderProps {
  children: React.ReactNode;
  store?: OverlayStoreApi;
}

export function ModalProvider({ children, store }: ModalProviderProps) {
  const overlayStore = useMemo(() => store || globalModalStore, [store]);
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
    <OverlayProvider store={overlayStore} adapters={adapters}>
      {children}
    </OverlayProvider>
  );
}
