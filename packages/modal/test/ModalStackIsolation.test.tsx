/// <reference types="@testing-library/jest-dom" />

import { StrictMode } from 'react';
import { createOverlayStore } from '@ilokesto/overlay';
import type { OverlayStoreApi } from '@ilokesto/overlay';
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ModalProvider } from '../src/components/ModalProvider';

interface ModalFixture {
  readonly id: string;
  readonly label: string;
  readonly transport?: 'inline' | 'top-layer';
  readonly render?: () => React.ReactNode;
}

function openModal(store: OverlayStoreApi, fixture: ModalFixture) {
  store.open({
    id: fixture.id,
    type: 'modal',
    props: {
      ariaLabel: fixture.label,
      transport: fixture.transport,
      render: fixture.render ?? (() => null),
    },
  });
}

describe('provider-scoped modal stacks', () => {
  afterEach(() => {
    cleanup();
    document.body.style.overflow = '';
    document.getElementById('ilokesto-modal-styles')?.remove();
  });

  it('lets Escape dismiss the top inline modal in each provider', () => {
    const firstStore = createOverlayStore();
    const secondStore = createOverlayStore();

    openModal(firstStore, { id: 'first-modal', label: 'First modal' });
    openModal(secondStore, { id: 'second-modal', label: 'Second modal' });

    render(
      <>
        <ModalProvider store={firstStore}>First provider</ModalProvider>
        <ModalProvider store={secondStore}>Second provider</ModalProvider>
      </>
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(firstStore.getSnapshot()[0]?.status).toBe('closing');
    expect(secondStore.getSnapshot()[0]?.status).toBe('closing');
  });

  it('keeps focus wrapping local to the active provider modal', () => {
    const firstStore = createOverlayStore();
    const secondStore = createOverlayStore();

    openModal(firstStore, {
      id: 'first-modal',
      label: 'First modal',
      render: () => (
        <>
          <button type="button">First start</button>
          <button type="button">First end</button>
        </>
      ),
    });
    openModal(secondStore, {
      id: 'second-modal',
      label: 'Second modal',
      render: () => (
        <>
          <button type="button">Second start</button>
          <button type="button">Second end</button>
        </>
      ),
    });

    render(
      <>
        <ModalProvider store={firstStore}>First provider</ModalProvider>
        <ModalProvider store={secondStore}>Second provider</ModalProvider>
      </>
    );

    screen.getByRole('button', { name: 'First end' }).focus();
    fireEvent.keyDown(document, { key: 'Tab' });

    expect(screen.getByRole('button', { name: 'First start' })).toHaveFocus();
  });

  it('handles top-layer cancel in the provider that owns the dialog', () => {
    const firstStore = createOverlayStore();
    const secondStore = createOverlayStore();

    openModal(firstStore, {
      id: 'first-dialog',
      label: 'First dialog',
      transport: 'top-layer',
    });
    openModal(secondStore, {
      id: 'second-dialog',
      label: 'Second dialog',
      transport: 'top-layer',
    });

    render(
      <>
        <ModalProvider store={firstStore}>First provider</ModalProvider>
        <ModalProvider store={secondStore}>Second provider</ModalProvider>
      </>
    );

    fireEvent(screen.getByRole('dialog', { name: 'First dialog' }), new Event('cancel'));

    expect(firstStore.getSnapshot()[0]?.status).toBe('closing');
    expect(secondStore.getSnapshot()[0]?.status).toBe('open');
  });

  it('removes StrictMode registrations before assigning later stack indexes', () => {
    const store = createOverlayStore();

    openModal(store, { id: 'first-modal', label: 'First modal' });
    openModal(store, { id: 'second-modal', label: 'Second modal' });

    render(
      <StrictMode>
        <ModalProvider store={store}>Provider</ModalProvider>
      </StrictMode>
    );

    let wrappers = document.querySelectorAll<HTMLElement>('.ilokesto-modal-inline-wrapper');
    expect(wrappers[0]).toHaveStyle({ zIndex: '10000' });
    expect(wrappers[1]).toHaveStyle({ zIndex: '10001' });

    act(() => {
      store.remove('second-modal');
    });
    act(() => {
      openModal(store, { id: 'replacement-modal', label: 'Replacement modal' });
    });

    wrappers = document.querySelectorAll<HTMLElement>('.ilokesto-modal-inline-wrapper');
    expect(wrappers[0]).toHaveStyle({ zIndex: '10000' });
    expect(wrappers[1]).toHaveStyle({ zIndex: '10001' });
  });

  it('keeps a mounted provider isolated when its sibling provider unmounts', () => {
    const firstStore = createOverlayStore();
    const secondStore = createOverlayStore();

    openModal(firstStore, { id: 'first-modal', label: 'First modal' });
    openModal(secondStore, { id: 'second-modal', label: 'Second modal' });

    const providers = (showFirst: boolean) => (
      <>
        {showFirst && <ModalProvider store={firstStore}>First provider</ModalProvider>}
        <ModalProvider store={secondStore}>Second provider</ModalProvider>
      </>
    );
    const { rerender } = render(providers(true));

    rerender(providers(false));

    const wrapper = document.querySelector<HTMLElement>('.ilokesto-modal-inline-wrapper');
    expect(wrapper).toHaveStyle({ zIndex: '10000' });

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss modal' }));

    expect(secondStore.getSnapshot()[0]?.status).toBe('closing');
  });

  it.each([
    ['first then second', ['first', 'second']],
    ['second then first', ['second', 'first']],
  ] as const)('restores body overflow after providers close %s', (_name, closeOrder) => {
    const firstStore = createOverlayStore();
    const secondStore = createOverlayStore();
    const stores = { first: firstStore, second: secondStore };
    const labels = { first: 'First modal', second: 'Second modal' };
    document.body.style.overflow = 'clip';

    openModal(firstStore, { id: 'first-modal', label: labels.first });
    openModal(secondStore, { id: 'second-modal', label: labels.second });

    render(
      <>
        <ModalProvider store={firstStore}>First provider</ModalProvider>
        <ModalProvider store={secondStore}>Second provider</ModalProvider>
      </>
    );

    for (const provider of closeOrder) {
      act(() => {
        stores[provider].close(`${provider}-modal`);
      });
      fireEvent.animationEnd(screen.getByRole('dialog', { name: labels[provider] }));
    }

    expect(document.body.style.overflow).toBe('clip');
  });
});
