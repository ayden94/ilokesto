/// <reference types="@testing-library/jest-dom" />

import { afterEach, describe, expect, it } from 'vitest';
import { createOverlayStore } from '@ilokesto/overlay';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ModalProvider } from '../src/components/ModalProvider';

describe('ModalProvider', () => {
  afterEach(() => {
    cleanup();
    document.getElementById('ilokesto-modal-styles')?.remove();
  });

  it('renders children and injects shared styles once', () => {
    const { rerender } = render(
      <ModalProvider>
        <div>App content</div>
      </ModalProvider>
    );

    expect(screen.getByText('App content')).not.toBeNull();
    expect(document.querySelectorAll('#ilokesto-modal-styles')).toHaveLength(1);

    rerender(
      <ModalProvider>
        <div>Updated content</div>
      </ModalProvider>
    );

    expect(screen.getByText('Updated content')).not.toBeNull();
    expect(document.querySelectorAll('#ilokesto-modal-styles')).toHaveLength(1);
  });

  it('keeps modal policy independent when two providers use distinct stores', () => {
    const firstStore = createOverlayStore();
    const secondStore = createOverlayStore();

    act(() => {
      firstStore.open({
        id: 'shared-modal-id',
        type: 'modal',
        props: { ariaLabel: 'First provider modal', render: () => null },
      });
      secondStore.open({
        id: 'shared-modal-id',
        type: 'modal',
        props: { ariaLabel: 'Second provider modal', render: () => null },
      });
    });

    render(
      <>
        <ModalProvider store={firstStore}>First provider</ModalProvider>
        <ModalProvider store={secondStore}>Second provider</ModalProvider>
      </>
    );

    const wrappers = document.querySelectorAll<HTMLElement>('.ilokesto-modal-inline-wrapper');
    expect(wrappers[0]).toHaveStyle({ zIndex: '10000' });
    expect(wrappers[1]).toHaveStyle({ zIndex: '10000' });

    fireEvent.click(screen.getAllByRole('button', { name: 'Dismiss modal' })[0]);

    expect(firstStore.getSnapshot()[0]?.status).toBe('closing');
    expect(secondStore.getSnapshot()[0]?.status).toBe('open');
  });
});
