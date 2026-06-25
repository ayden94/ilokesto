/// <reference types="@testing-library/jest-dom" />

import { useState } from 'react';
import type React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { ModalProvider } from '../src/components/ModalProvider';
import { modal } from '../src/facade/modalFacade';
import { useModal } from '../src/hooks/useModal';

function ModalContent({ close }: { close: (result?: boolean) => void }) {
  return (
    <section>
      <button type="button" onClick={() => close(true)}>
        Confirm inside
      </button>
    </section>
  );
}

function Launcher() {
  const { display } = useModal();
  const [result, setResult] = useState('pending');

  const openModal = async () => {
    const confirmed = await display<boolean>({
      id: 'render-confirm',
      ariaLabel: 'Render confirm',
      render: (close) => <ModalContent close={close} />,
    });

    setResult(String(confirmed));
  };

  return (
    <div>
      <button type="button" onClick={openModal}>
        Open modal
      </button>
      <span>Result: {result}</span>
    </div>
  );
}

describe('useModal render callback', () => {
  afterEach(() => {
    act(() => {
      modal.clear();
    });
    cleanup();
    document.body.style.overflow = '';
  });

  it('lets modal content resolve its display promise with scoped close', async () => {
    render(
      <ModalProvider>
        <Launcher />
      </ModalProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open modal' }));

    expect(await screen.findByRole('dialog', { name: 'Render confirm' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Confirm inside' }));
    fireEvent.animationEnd(screen.getByRole('dialog', { name: 'Render confirm' }));

    await waitFor(() => {
      expect(screen.getByText('Result: true')).toBeInTheDocument();
    });
  });

  it('passes scoped context to render content', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ModalProvider>{children}</ModalProvider>
    );
    const { result } = renderHook(() => useModal(), { wrapper });

    act(() => {
      result.current.display({
        id: 'context-modal',
        ariaLabel: 'Context modal',
        render: (_close, context) => <span>Modal status: {context.status}</span>,
      });
    });

    expect(await screen.findByRole('dialog', { name: 'Context modal' })).toBeInTheDocument();
    expect(screen.getByText('Modal status: open')).toBeInTheDocument();

    act(() => {
      result.current.clear();
    });
  });

  it('calls onModalClose once with the scoped close result', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ModalProvider>{children}</ModalProvider>
    );
    const { result } = renderHook(() => useModal(), { wrapper });
    const onModalClose = vi.fn();

    act(() => {
      result.current.display({
        id: 'close-callback-modal',
        ariaLabel: 'Close callback modal',
        onModalClose,
        render: (close) => (
          <button type="button" onClick={() => close('done')}>
            Finish
          </button>
        ),
      });
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Finish' }));
    fireEvent.animationEnd(screen.getByRole('dialog', { name: 'Close callback modal' }));

    expect(onModalClose).toHaveBeenCalledTimes(1);
    expect(onModalClose).toHaveBeenCalledWith('done');
  });

  it('calls onModalClose when the global facade closes a modal', async () => {
    const onModalClose = vi.fn();

    render(
      <ModalProvider>
        <div>App</div>
      </ModalProvider>
    );

    act(() => {
      modal.display({
        id: 'global-close-modal',
        ariaLabel: 'Global close modal',
        onModalClose,
        render: () => <span>Global content</span>,
      });
    });

    expect(await screen.findByRole('dialog', { name: 'Global close modal' })).toBeInTheDocument();

    act(() => {
      modal.close('global-close-modal', 'done');
    });

    expect(onModalClose).toHaveBeenCalledTimes(1);
    expect(onModalClose).toHaveBeenCalledWith('done');
  });

  it('calls modal close callbacks in order when clear removes every modal', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ModalProvider>{children}</ModalProvider>
    );
    const { result } = renderHook(() => useModal(), { wrapper });
    const closeOrder: string[] = [];

    act(() => {
      result.current.display({
        id: 'first-modal',
        ariaLabel: 'First modal',
        onModalClose: () => closeOrder.push('first'),
        render: () => <span>First</span>,
      });
      result.current.display({
        id: 'second-modal',
        ariaLabel: 'Second modal',
        onModalClose: () => closeOrder.push('second'),
        render: () => <span>Second</span>,
      });
    });

    expect(await screen.findByRole('dialog', { name: 'First modal' })).toBeInTheDocument();
    expect(await screen.findByRole('dialog', { name: 'Second modal' })).toBeInTheDocument();

    act(() => {
      result.current.clear();
    });

    expect(closeOrder).toEqual(['first', 'second']);
  });

});
