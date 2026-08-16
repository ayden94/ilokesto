import { useMemo } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { render } from '@testing-library/react';
import {
  createModalStackRuntime,
  ModalStackRuntimeContext,
} from '../src/hooks/useIsTopModal';

function ModalStackTestProvider({ children }: { readonly children: ReactNode }) {
  const runtime = useMemo(createModalStackRuntime, []);

  return (
    <ModalStackRuntimeContext.Provider value={runtime}>
      {children}
    </ModalStackRuntimeContext.Provider>
  );
}

export function renderWithModalStack(element: ReactElement) {
  return render(element, { wrapper: ModalStackTestProvider });
}
